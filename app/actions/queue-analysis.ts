"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProcessQueueAnalysis {
  processTypeName: string;
  lambda: number;       // arrivals per day (jobs starting this process type)
  mu: number;           // completions per day (jobs completing this process type)
  rho_mm1: number;      // utilization under M/M/1
  rho_mm2: number;      // utilization under M/M/2
  wq_mm1: number | null;  // avg wait time in days under M/M/1, null if unstable
  wq_mm2: number | null;  // avg wait time in days under M/M/2, null if unstable
  stable_mm1: boolean;
  stable_mm2: boolean;
  insufficientData: boolean;  // fewer than 3 days of history
  dataDays: number;           // how many days of data were used
}

/** Extended analysis used by the Queue Constraint Dashboard page */
export interface StageAnalysis extends ProcessQueueAnalysis {
  /** Per-day ρ (M/M/1) ordered oldest → newest for the chosen window */
  sparkMm1: number[];
  /** Per-day ρ (M/M/2) ordered oldest → newest for the chosen window */
  sparkMm2: number[];
  actionMm1: string; // recommended action given rho_mm1
  actionMm2: string; // recommended action given rho_mm2
}

/** All seven production process type names, in order */
const PROCESS_TYPES = [
  "Cutting",
  "Printing",
  "Pre-Fold/Inspection",
  "Trimming",
  "Folding",
  "Stitching",
  "Inspection",
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRecommendedAction(rho: number, model: "mm1" | "mm2"): string {
  if (rho === 0) return "No data — cannot assess this stage";
  if (model === "mm1") {
    if (rho < 0.5)   return "Stage under-utilized — no action needed";
    if (rho <= 0.63) return "Monitor closely — approaching capacity";
    if (rho < 1)     return "Consider adding a 2nd operator (M/M/2 upgrade)";
    return "Critical bottleneck — add parallel server immediately";
  } else {
    if (rho < 0.5)   return "Reallocate staff to higher-load stages";
    if (rho <= 0.63) return "Monitor closely — at stability boundary";
    if (rho < 1)     return "Increase operator capacity at this stage";
    return "Stage overloaded — immediate escalation required";
  }
}

// Erlang-C P0 for M/M/2 (s=2)
function computeP0mm2(a: number): number {
  // a = lambda / mu  (called traffic intensity per server)
  // P0 = [ sum(n=0 to 1){ a^n/n! } + a^2/(2! * (1 - a/2)) ]^-1
  // = [ 1 + a + a^2 / (2*(1 - a/2)) ]^-1
  const rho = a / 2; // utilization = lambda/(s*mu)
  if (rho >= 1) return 0; // unstable
  const sum01 = 1 + a;
  const lastTerm = (a * a) / (2 * (1 - rho));
  return 1 / (sum01 + lastTerm);
}

function computeWqMm2(lambda: number, mu: number): number | null {
  const rho = lambda / (2 * mu);
  if (rho >= 1) return null;
  const a = lambda / mu;
  const P0 = computeP0mm2(a);
  // Lq = P0 * a^2 * rho / (2! * (1-rho)^2)
  const Lq = (P0 * Math.pow(a, 2) * rho) / (2 * Math.pow(1 - rho, 2));
  return Lq / lambda; // Wq = Lq / lambda  (in days, same unit as lambda/mu)
}

// ─── Server Actions ───────────────────────────────────────────────────────────

/**
 * Computes M/M/1 and M/M/2 queuing metrics for a given process type
 * using ProcessUpdate records from the last 7 days.
 */
export async function getProcessTypeAnalysis(
  processTypeName: string
): Promise<ProcessQueueAnalysis> {
  const windowDays = 7;
  const since = new Date(Date.now() - windowDays * 86_400_000);

  // Count how many ProcessUpdate records we have per status transition
  // We join through Process.name to filter by process type
  const [startedCount, completedCount, oldestRecord] = await Promise.all([
    prisma.processUpdate.count({
      where: {
        process: { name: processTypeName },
        newStatus: "IN_PROGRESS",
        createdAt: { gte: since },
      },
    }),
    prisma.processUpdate.count({
      where: {
        process: { name: processTypeName },
        newStatus: "COMPLETED",
        createdAt: { gte: since },
      },
    }),
    prisma.processUpdate.findFirst({
      where: { process: { name: processTypeName } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);

  // Determine actual data span
  const dataDays = oldestRecord
    ? Math.min(
        windowDays,
        Math.max(
          1,
          Math.ceil(
            (Date.now() - oldestRecord.createdAt.getTime()) / 86_400_000
          )
        )
      )
    : 0;

  const insufficientData = dataDays < 3 || (startedCount === 0 && completedCount === 0);

  // Use actual data span for rate calculation (more accurate than always dividing by 7)
  const span = Math.max(dataDays, 1);
  const lambda = startedCount / span;
  const mu = completedCount / span;

  if (mu === 0 || lambda === 0) {
    return {
      processTypeName,
      lambda,
      mu,
      rho_mm1: 0,
      rho_mm2: 0,
      wq_mm1: null,
      wq_mm2: null,
      stable_mm1: true,
      stable_mm2: true,
      insufficientData: true,
      dataDays,
    };
  }

  const rho_mm1 = lambda / mu;
  const rho_mm2 = lambda / (2 * mu);

  const stable_mm1 = rho_mm1 < 1;
  const stable_mm2 = rho_mm2 < 1;

  // M/M/1 Wq = lambda / [mu * (mu - lambda)]
  const wq_mm1 = stable_mm1 ? lambda / (mu * (mu - lambda)) : null;
  const wq_mm2 = computeWqMm2(lambda, mu);

  return {
    processTypeName,
    lambda,
    mu,
    rho_mm1,
    rho_mm2,
    wq_mm1,
    wq_mm2,
    stable_mm1,
    stable_mm2,
    insufficientData,
    dataDays,
  };
}

/**
 * Fetches queue health (rho_mm1, rho_mm2, stable) for all core process types.
 * Used to render the quick tiles on the admin dashboard.
 */
export async function getAllProcessTypeHealth(): Promise<
  { name: string; rho_mm1: number; rho_mm2: number; stable_mm1: boolean; insufficientData: boolean }[]
> {
  const results = await Promise.all(
    PROCESS_TYPES.map(async (t) => {
      const a = await getProcessTypeAnalysis(t);
      return {
        name: t,
        rho_mm1: a.rho_mm1,
        rho_mm2: a.rho_mm2,
        stable_mm1: a.stable_mm1,
        insufficientData: a.insufficientData,
      };
    })
  );

  return results;
}

/**
 * Fetches full StageAnalysis for all process types in a single DB query.
 * Includes per-day sparkline data and recommended actions.
 * Used by the Queue Constraint Dashboard page.
 */
export async function getDashboardAnalysis(
  windowDays: number = 7
): Promise<StageAnalysis[]> {
  const session = await auth();
  if (!session?.user) return [];
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "EMPLOYEE") return [];

  const since = new Date(Date.now() - windowDays * 86_400_000);

  // Single query for all process types
  const updates = await prisma.processUpdate.findMany({
    where: {
      createdAt: { gte: since },
      process: { name: { in: [...PROCESS_TYPES] } },
    },
    select: {
      createdAt: true,
      newStatus: true,
      process: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return PROCESS_TYPES.map((typeName) => {
    const typeUpdates = updates.filter((u) => u.process.name === typeName);

    // Build per-day buckets oldest → newest
    const days: { dayKey: string; started: number; completed: number }[] = [];
    for (let d = windowDays - 1; d >= 0; d--) {
      const dt = new Date(Date.now() - d * 86_400_000);
      days.push({ dayKey: dt.toISOString().slice(0, 10), started: 0, completed: 0 });
    }
    for (const u of typeUpdates) {
      const key = u.createdAt.toISOString().slice(0, 10);
      const bucket = days.find((d) => d.dayKey === key);
      if (bucket) {
        if (u.newStatus === "IN_PROGRESS") bucket.started++;
        if (u.newStatus === "COMPLETED")   bucket.completed++;
      }
    }

    const totalStarted   = days.reduce((s, d) => s + d.started,   0);
    const totalCompleted = days.reduce((s, d) => s + d.completed, 0);
    const activeDays     = days.filter((d) => d.started > 0 || d.completed > 0).length;
    const dataDays       = activeDays;
    const insufficientData = dataDays < 3 || (totalStarted === 0 && totalCompleted === 0);
    const span   = Math.max(dataDays, 1);
    const lambda = totalStarted   / span;
    const mu     = totalCompleted / span;

    const sparkMm1 = days.map((d) =>
      d.completed > 0 ? parseFloat((d.started / d.completed).toFixed(3)) : 0
    );
    const sparkMm2 = days.map((d) =>
      d.completed > 0 ? parseFloat((d.started / (2 * d.completed)).toFixed(3)) : 0
    );

    if (mu === 0 || lambda === 0) {
      return {
        processTypeName: typeName,
        lambda,
        mu,
        rho_mm1: 0,
        rho_mm2: 0,
        wq_mm1: null,
        wq_mm2: null,
        stable_mm1: true,
        stable_mm2: true,
        insufficientData: true,
        dataDays,
        sparkMm1,
        sparkMm2,
        actionMm1: getRecommendedAction(0, "mm1"),
        actionMm2: getRecommendedAction(0, "mm2"),
      };
    }

    const rho_mm1 = lambda / mu;
    const rho_mm2 = lambda / (2 * mu);

    return {
      processTypeName: typeName,
      lambda,
      mu,
      rho_mm1,
      rho_mm2,
      wq_mm1: rho_mm1 < 1 ? lambda / (mu * (mu - lambda)) : null,
      wq_mm2: computeWqMm2(lambda, mu),
      stable_mm1: rho_mm1 < 1,
      stable_mm2: rho_mm2 < 1,
      insufficientData,
      dataDays,
      sparkMm1,
      sparkMm2,
      actionMm1: getRecommendedAction(rho_mm1, "mm1"),
      actionMm2: getRecommendedAction(rho_mm2, "mm2"),
    };
  });
}

/**
 * Saves a Line Leader's response (ACCEPTED / REJECTED) to a queue suggestion.
 * ACCEPTED also sets item.suggestionBoost = true to raise its SJF priority.
 * Admin role can call this to view but not accept/reject (enforced client-side).
 */
export async function respondToQueueSuggestion(
  processId: string,
  itemId: string,
  processTypeName: string,
  response: "ACCEPTED" | "REJECTED",
  rho: number
): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const role = (session.user as any).role;
  if (role !== "EMPLOYEE" && role !== "ADMIN") return { error: "Unauthorized" };

  try {
    // Create log record
    await prisma.queueSuggestionLog.create({
      data: {
        processId,
        itemId,
        userId: session.user.id,
        processTypeName,
        rho,
        response,
      },
    });

    // Boost priority if accepted
    if (response === "ACCEPTED") {
      await prisma.item.update({
        where: { id: itemId },
        data: { suggestionBoost: true },
      });
    }

    revalidatePath("/dashboard/employee");
    revalidatePath("/dashboard/queue");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err) {
    console.error("respondToQueueSuggestion error:", err);
    return { error: "Failed to save response" };
  }
}

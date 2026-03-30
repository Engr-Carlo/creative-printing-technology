"use server";

import prisma from "@/lib/prisma";

// ─── Tuning constants ────────────────────────────────────────────────────────
//
// SJF with Aging prevents starvation using this formula:
//
//   priority = (BASE_WEIGHT / estimatedDuration) + (waitingHours * AGING_RATE)
//
// BASE_WEIGHT  — how strongly shorter jobs are preferred at time of arrival
// AGING_RATE   — how many priority points a job gains per hour of waiting
//                Set high enough so a job waiting >CRITICAL_HOURS will always
//                overtake a newly arrived short job.
//
// Aging tiers (for UI display only):
//   FRESH    : 0  – AGING_THRESHOLD_HRS
//   AGING    : AGING_THRESHOLD_HRS – CRITICAL_THRESHOLD_HRS
//   CRITICAL : > CRITICAL_THRESHOLD_HRS  → always floated to top regardless

const BASE_WEIGHT            = 1000; // priority points for a 1-minute job
const AGING_RATE             = 20;   // +20 priority per hour of waiting
const AGING_THRESHOLD_HRS    = 4;    // yellow warning after 4 hrs
const CRITICAL_THRESHOLD_HRS = 8;    // red / pinned after 8 hrs
const DEFAULT_DURATION_MIN   = 120;  // assumed duration when encoder skips the field

export type AgingTier = "FRESH" | "AGING" | "CRITICAL";

export interface SJFEntry {
  id: string;
  itemNumber: string;
  name: string;
  customer: string;
  type: string;
  status: string;
  estimatedDuration: number;       // minutes
  waitingHours: number;            // hours since item was created & not yet started
  priorityScore: number;           // higher = processed first
  agingTier: AgingTier;
  deadline: string;
  rawMaterials: string;
  processCount: number;
  completedProcesses: number;
  suggestionBoost: boolean;        // true when Line Leader accepted a queue suggestion
}

export async function getSJFQueue(): Promise<SJFEntry[]> {
  // Only items that are PENDING or IN_PROGRESS (not done / rejected)
  const items = await prisma.item.findMany({
    where: { status: { in: ["PENDING", "IN_PROGRESS"] } },
    include: {
      processes: { select: { status: true } },
    },
    // select includes suggestionBoost via include (Prisma returns all scalar fields)
  });

  const now = Date.now();

  const entries: SJFEntry[] = (items as any[]).map((item) => {
    const duration = (item as any).estimatedDuration ?? DEFAULT_DURATION_MIN;
    const waitingHours = (now - new Date(item.createdAt).getTime()) / 3_600_000;

    // Core SJF + Aging priority formula
    const basePriority = BASE_WEIGHT / duration;
    const agingBonus   = waitingHours * AGING_RATE;
    // Suggestion boost: +500 when a Line Leader accepted the queue suggestion for this item
    const suggestionBonus = (item as any).suggestionBoost ? 500 : 0;
    let   priorityScore = Math.round((basePriority + agingBonus + suggestionBonus) * 10) / 10;

    // Critical jobs float to top: very high score overrides everything
    let agingTier: AgingTier = "FRESH";
    if (waitingHours >= CRITICAL_THRESHOLD_HRS) {
      agingTier = "CRITICAL";
      priorityScore += 999_999; // guaranteed first
    } else if (waitingHours >= AGING_THRESHOLD_HRS) {
      agingTier = "AGING";
    }

    let completedProcesses = 0;
    if ((item as any).processes && Array.isArray((item as any).processes)) {
      completedProcesses = ((item as any).processes as Array<{status: string}>).reduce((count: number, p) => 
        p.status === "COMPLETED" ? count + 1 : count, 0);
    }

    return {
      id: item.id,
      itemNumber: item.itemNumber,
      name: item.name,
      customer: item.customer,
      type: item.type,
      status: item.status,
      estimatedDuration: duration,
      waitingHours: Math.round(waitingHours * 10) / 10,
      priorityScore,
      agingTier,
      deadline: item.deadline.toISOString(),
      rawMaterials: (item as any).rawMaterials ?? "AVAILABLE",
      processCount: item.processes.length,
      completedProcesses,
      suggestionBoost: (item as any).suggestionBoost ?? false,
    };
  });

  // Sort: highest priority score first (ties broken by deadline ascending)
  return entries.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });
}

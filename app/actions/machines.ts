"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { MACHINE_PROCESS_AFFINITY } from "@/lib/constants/machines";

export interface MachineCurrentJob {
  processId: string;
  processName: string;
  itemNumber: string;
  itemName: string;
  assignedToName: string | null;
  startedAt: string | null;
}

export interface MachineWithStatus {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  department: { id: string; name: string };
  /** Set only when Process.machineId is explicitly linked to this machine */
  currentJob: MachineCurrentJob | null;
  /** Total completed processes today for this machine's process type (fleet-wide ÷ fleet size) */
  todayCompletedCount: number;
  /** Number of MACHINE_BREAKDOWN delays reported in the last 30 days on this machine */
  recentBreakdownCount: number;
  /** Process steps this machine type handles e.g. ["Printing"] */
  handlesProcesses: string[];
  /**
   * Count of IN_PROGRESS processes (floor-wide, for this machine's process type)
   * divided proportionally across machines of the same type.
   * Used to visualise load when machineId FK is not set.
   */
  fleetActiveEstimate: number;
}

export async function getMachinesData(): Promise<MachineWithStatus[]> {
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const machines = await prisma.machine.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
    include: {
      department: { select: { id: true, name: true } },
      // Direct machineId-linked IN_PROGRESS processes (most accurate when set)
      processes: {
        where: { status: "IN_PROGRESS" },
        take: 1,
        include: {
          item: { select: { itemNumber: true, name: true } },
          assignedTo: { select: { name: true } },
        },
        orderBy: { startedAt: "desc" },
      },
    },
  });

  // ── Fleet-level stats by process name affinity ───────────────────────────
  // Collect all unique process names used across all machine types
  const allAffinityNames = Array.from(
    new Set(Object.values(MACHINE_PROCESS_AFFINITY).flat())
  );

  const [affinityActive, affinityCompleted, machineBreakdowns] = await Promise.all([
    // Count IN_PROGRESS processes by name (fleet-wide, not per machine)
    prisma.process.groupBy({
      by: ["name"],
      where: { name: { in: allAffinityNames }, status: "IN_PROGRESS" },
      _count: { id: true },
    }),
    // Count COMPLETED processes today by name
    prisma.process.groupBy({
      by: ["name"],
      where: {
        name: { in: allAffinityNames },
        status: "COMPLETED",
        completedAt: { gte: todayMidnight },
      },
      _count: { id: true },
    }),
    // MACHINE_BREAKDOWN delays per machine via machineId FK
    prisma.delayReason.findMany({
      where: {
        category: "MACHINE_BREAKDOWN",
        createdAt: { gte: thirtyDaysAgo },
        process: { machineId: { in: machines.map((m) => m.id) } },
      },
      select: { process: { select: { machineId: true } } },
    }),
  ]);

  // Build maps: processName → count
  const activeByName: Record<string, number> = {};
  for (const r of affinityActive) activeByName[r.name] = r._count.id;

  const completedByName: Record<string, number> = {};
  for (const r of affinityCompleted) completedByName[r.name] = r._count.id;

  // Build map: machineId → breakdown count
  const breakdownByMachine: Record<string, number> = {};
  for (const d of machineBreakdowns) {
    const mid = d.process?.machineId;
    if (mid) breakdownByMachine[mid] = (breakdownByMachine[mid] ?? 0) + 1;
  }

  // Count machines per type (for fair proportional distribution)
  const countByType: Record<string, number> = {};
  for (const m of machines) {
    countByType[m.type] = (countByType[m.type] ?? 0) + (m.isActive ? 1 : 0);
  }

  return machines.map((m) => {
    const handles = MACHINE_PROCESS_AFFINITY[m.type] ?? [];
    const fleetCount = countByType[m.type] || 1;

    // Sum fleet-wide active and completed for all process names in affinity
    const fleetActiveTotal = handles.reduce((acc, name) => acc + (activeByName[name] ?? 0), 0);
    const fleetCompletedTotal = handles.reduce((acc, name) => acc + (completedByName[name] ?? 0), 0);

    // Distribute proportionally across active machines of this type
    const fleetActiveEstimate = Math.round(fleetActiveTotal / fleetCount);
    const todayCompletedCount = Math.round(fleetCompletedTotal / fleetCount);

    const active = m.processes[0];
    return {
      id: m.id,
      name: m.name,
      type: m.type,
      isActive: m.isActive,
      department: m.department,
      currentJob: active
        ? {
            processId: active.id,
            processName: active.name,
            itemNumber: active.item.itemNumber,
            itemName: active.item.name,
            assignedToName: active.assignedTo?.name ?? null,
            startedAt: active.startedAt?.toISOString() ?? null,
          }
        : null,
      todayCompletedCount,
      recentBreakdownCount: breakdownByMachine[m.id] ?? 0,
      handlesProcesses: handles,
      fleetActiveEstimate,
    };
  });
}

/** Lightweight list of machine names for dropdowns / quick-generate forms */
export async function getMachineNames(): Promise<{ name: string; type: string }[]> {
  const machines = await prisma.machine.findMany({
    where: { isActive: true },
    select: { name: true, type: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  return machines;
}

export async function createMachine(data: {
  name: string;
  type: string;
  departmentId: string;
}) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return { error: "Unauthorized" };
  }
  if (!data.name.trim() || !data.type.trim() || !data.departmentId) {
    return { error: "All fields are required" };
  }
  try {
    await prisma.machine.create({
      data: {
        name: data.name.trim(),
        type: data.type.trim(),
        departmentId: data.departmentId,
        isActive: true,
      },
    });
    revalidatePath("/dashboard/machines");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Failed to create machine" };
  }
}

export async function updateMachine(
  id: string,
  data: { name: string; type: string; departmentId: string }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return { error: "Unauthorized" };
  }
  try {
    await prisma.machine.update({
      where: { id },
      data: {
        name: data.name.trim(),
        type: data.type.trim(),
        departmentId: data.departmentId,
      },
    });
    revalidatePath("/dashboard/machines");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Failed to update machine" };
  }
}

export async function toggleMachineActive(id: string, isActive: boolean) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return { error: "Unauthorized" };
  }
  try {
    await prisma.machine.update({ where: { id }, data: { isActive } });
    revalidatePath("/dashboard/machines");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Failed to update machine status" };
  }
}

"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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
  currentJob: MachineCurrentJob | null;
  todayCompletedCount: number;
  recentBreakdownCount: number;
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

  // Batch queries for today's completions and recent breakdowns per machine
  const machineIds = machines.map((m) => m.id);

  const [todayCompletions, breakdowns] = await Promise.all([
    prisma.process.groupBy({
      by: ["machineId"],
      where: {
        machineId: { in: machineIds },
        status: "COMPLETED",
        completedAt: { gte: todayMidnight },
      },
      _count: { id: true },
    }),
    prisma.delayReason.groupBy({
      by: ["processId"],
      where: {
        category: "MACHINE_BREAKDOWN",
        createdAt: { gte: thirtyDaysAgo },
        process: { machineId: { in: machineIds } },
      },
      _count: { id: true },
    }),
  ]);

  // Map breakdown counts by machineId via a second query
  const breakdownProcessIds = breakdowns.map((b) => b.processId);
  const breakdownProcesses = breakdownProcessIds.length > 0
    ? await prisma.process.findMany({
        where: { id: { in: breakdownProcessIds } },
        select: { id: true, machineId: true },
      })
    : [];

  // Build a machineId → breakdownCount map
  const breakdownByMachine: Record<string, number> = {};
  for (const bp of breakdownProcesses) {
    if (!bp.machineId) continue;
    const entry = breakdowns.find((b) => b.processId === bp.id);
    breakdownByMachine[bp.machineId] =
      (breakdownByMachine[bp.machineId] ?? 0) + (entry?._count.id ?? 0);
  }

  const completionByMachine: Record<string, number> = {};
  for (const c of todayCompletions) {
    if (c.machineId) completionByMachine[c.machineId] = c._count.id;
  }

  return machines.map((m) => {
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
      todayCompletedCount: completionByMachine[m.id] ?? 0,
      recentBreakdownCount: breakdownByMachine[m.id] ?? 0,
    };
  });
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

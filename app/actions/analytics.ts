"use server";

import prisma from "@/lib/prisma";

export interface ProcessQueueEntry {
  id: string;
  jrNumber: string;
  itemName: string;
  arrivalTime: string | null;
  startTime: string | null;
  completionTime: string | null;
  status: string;
  waitingMinutes: number | null;
}

export interface ProcessQueueMetrics {
  arrivalRate: number;    // JRs arriving per hour (within filter window)
  serviceRate: number;    // JRs completed per hour (within filter window)
  utilization: number;    // % (0-100)
  avgWaitingTime: number; // minutes (arrival → start)
  total: number;
  completed: number;
  inProgress: number;
}

export async function getProcessQueueData(
  processName: string,
  filterHours: number,
  itemType?: string
): Promise<{ entries: ProcessQueueEntry[]; metrics: ProcessQueueMetrics }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - filterHours * 3600000);

  const processes = await prisma.process.findMany({
    where: {
      name: processName,
      ...(itemType ? { item: { type: itemType as any } } : {}),
    },
    include: {
      item: {
        select: {
          itemNumber: true,
          name: true,
          createdAt: true,
          processes: {
            select: { order: true, completedAt: true },
            orderBy: { order: "asc" },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const entries: ProcessQueueEntry[] = processes.map((p) => {
    // Arrival time = previous process's completedAt (null if not yet completed),
    // or item.createdAt only for the very first process (no predecessor).
    const prevProcess = p.item.processes.find((ip) => ip.order === p.order - 1);
    const arrivalRaw = prevProcess !== undefined
      ? prevProcess.completedAt   // null until the previous process finishes
      : p.item.createdAt;         // first process: arrived when the item was created

    const waitingMinutes =
      p.startedAt && arrivalRaw
        ? Math.max(
            0,
            Math.round(
              (new Date(p.startedAt).getTime() - new Date(arrivalRaw).getTime()) / 60000
            )
          )
        : null;

    return {
      id: p.id,
      jrNumber: p.item.itemNumber,
      itemName: p.item.name,
      arrivalTime: arrivalRaw ? new Date(arrivalRaw).toISOString() : null,
      startTime: p.startedAt ? new Date(p.startedAt).toISOString() : null,
      completionTime: p.completedAt ? new Date(p.completedAt).toISOString() : null,
      status: p.status,
      waitingMinutes,
    };
  });

  // Queuing metrics relative to the filter window
  const arrivedInWindow = entries.filter(
    (e) => e.arrivalTime && new Date(e.arrivalTime) >= windowStart
  ).length;
  const completedInWindow = entries.filter(
    (e) => e.completionTime && new Date(e.completionTime) >= windowStart
  ).length;

  const arrivalRate = Math.round((arrivedInWindow / filterHours) * 10) / 10;
  const serviceRate = Math.round((completedInWindow / filterHours) * 10) / 10;
  const utilization =
    serviceRate > 0 ? Math.min(Math.round((arrivalRate / serviceRate) * 100), 100) : 0;

  const waitTimes = entries
    .filter((e) => e.waitingMinutes !== null)
    .map((e) => e.waitingMinutes as number);
  const avgWaitingTime =
    waitTimes.length > 0
      ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length)
      : 0;

  return {
    entries,
    metrics: {
      arrivalRate,
      serviceRate,
      utilization,
      avgWaitingTime,
      total: entries.length,
      completed: entries.filter((e) => e.status === "COMPLETED").length,
      inProgress: entries.filter((e) => e.status === "IN_PROGRESS").length,
    },
  };
}

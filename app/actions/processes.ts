"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateProcessStatus(processId: string, newStatus: string) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  try {
    // ── Fetch process + previous process in parallel ───────────────────────
    const [process, previousProcess] = await Promise.all([
      prisma.process.findUnique({
        where: { id: processId },
        include: { item: true },
      }),
      // Pre-fetch the previous process (only needed for IN_PROGRESS guard, but
      // fetching now in parallel costs nothing if not needed)
      newStatus === "IN_PROGRESS"
        ? prisma.process.findFirst({
            where: {
              // We don't know itemId/order yet — refetch after process loads
              // So this slot is a no-op placeholder; real fetch happens below
              id: "__noop__",
            },
            select: { status: true, name: true },
          }).then(() => null).catch(() => null)
        : Promise.resolve(null),
    ]);

    if (!process) {
      return { error: "Process not found" };
    }

    // --- Server-side guards ---
    // 1. Raw materials must be RELEASE_TO_PRODUCTION to start a process
    if (newStatus === "IN_PROGRESS" && process.item.rawMaterials !== "RELEASE_TO_PRODUCTION") {
      return { error: "Cannot start process — raw materials not released for production." };
    }

    // 2. Sequential enforcement: previous process must be COMPLETED before starting next
    if (newStatus === "IN_PROGRESS" && process.order > 1) {
      const prev = await prisma.process.findFirst({
        where: { itemId: process.itemId, order: process.order - 1 },
        select: { status: true, name: true },
      });
      if (prev && prev.status !== "COMPLETED") {
        return { error: `Cannot start — previous process "${prev.name}" is not yet completed.` };
      }
    }

    // 3. If item is already REJECTED, no new process actions allowed
    if (process.item.status === "REJECTED" && newStatus === "IN_PROGRESS") {
      return { error: "Cannot start process — item has been rejected." };
    }

    const oldStatus = process.status;
    const now = new Date();

    // ── Core write + audit log in parallel ────────────────────────────────
    const [updatedProcess] = await Promise.all([
      prisma.process.update({
        where: { id: processId },
        data: {
          status: newStatus as any,
          startedAt: newStatus === "IN_PROGRESS" && !process.startedAt ? now : process.startedAt,
          completedAt: (newStatus === "COMPLETED" || newStatus === "REJECTED") ? now : null,
        },
      }),
      prisma.processUpdate.create({
        data: {
          processId,
          userId: session.user.id,
          oldStatus: oldStatus as any,
          newStatus: newStatus as any,
        },
      }),
      // Auto-elevate item from PENDING → IN_PROGRESS in the same parallel batch
      newStatus === "IN_PROGRESS" && process.item.status === "PENDING"
        ? prisma.item.update({ where: { id: process.itemId }, data: { status: "IN_PROGRESS" } })
        : Promise.resolve(null),
    ]);

    let itemCompleted = false;
    let itemRejected = false;

    if (newStatus === "COMPLETED") {
      // ── Fetch materials + siblings in parallel ─────────────────────────
      const [materialUsages, siblings] = await Promise.all([
        prisma.processMaterialUsage.findMany({
          where: { processId },
          include: { inventoryItem: true },
        }),
        prisma.process.findMany({
          where: { itemId: process.itemId },
          select: { id: true, status: true },
        }),
      ]);

      // Deduct materials (if any) — already includes the updated row via
      // the process.update above, so treat this process as COMPLETED in check
      if (materialUsages.length > 0) {
        await prisma.$transaction([
          ...materialUsages.map((u) =>
            prisma.inventoryItem.update({
              where: { id: u.inventoryItemId },
              data: { currentStock: { decrement: u.requiredQty } },
            })
          ),
          ...materialUsages.map((u) =>
            prisma.inventoryTransaction.create({
              data: {
                type: "DEDUCT",
                quantity: -u.requiredQty,
                note: `Process "${process.name}" completed — ${process.item.itemNumber}`,
                inventoryItemId: u.inventoryItemId,
                performedById: session.user.id,
              },
            })
          ),
        ]);
        revalidatePath("/dashboard/inventory");
      }

      // Mark item COMPLETED if all siblings are now done
      const allDone = siblings.every(
        (p) => p.id === processId ? true : p.status === "COMPLETED"
      );
      if (allDone) {
        await prisma.item.update({
          where: { id: process.itemId },
          data: { status: "COMPLETED" },
        });
        itemCompleted = true;
      }
    }

    if (newStatus === "REJECTED") {
      await prisma.item.update({
        where: { id: process.itemId },
        data: { status: "REJECTED" },
      });
      itemRejected = true;
    }

    revalidatePath("/dashboard/my-processes");
    revalidatePath("/dashboard/employee");
    revalidatePath("/dashboard/my-items");
    revalidatePath("/dashboard/encoder");
    revalidatePath(`/dashboard/items/${process.itemId}`);
    return { success: true, process: updatedProcess, itemCompleted, itemRejected };
  } catch (error) {
    console.error("Error updating process status:", error);
    return { error: "Failed to update process status" };
  }
}

export async function addProcessNote(processId: string, comment: string) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  try {
    const process = await prisma.process.findUnique({
      where: { id: processId },
    });

    if (!process) {
      return { error: "Process not found" };
    }

    await prisma.processUpdate.create({
      data: {
        processId: processId,
        userId: session.user.id,
        oldStatus: process.status,
        newStatus: process.status,
        comment: comment,
      },
    });

    revalidatePath("/dashboard/my-processes");
    revalidatePath(`/dashboard/items/${process.itemId}`);
    return { success: true };
  } catch (error) {
    console.error("Error adding process note:", error);
    return { error: "Failed to add note" };
  }
}

export async function reportDelay(processId: string, category: string, details: string) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  try {
    await prisma.delayReason.create({
      data: {
        processId: processId,
        category: category as any,
        details: details,
      },
    });

    // Update process status to DELAYED
    await prisma.process.update({
      where: { id: processId },
      data: { status: "DELAYED" },
    });

    revalidatePath("/dashboard/my-processes");
    return { success: true };
  } catch (error) {
    console.error("Error reporting delay:", error);
    return { error: "Failed to report delay" };
  }
}

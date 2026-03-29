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
    const process = await prisma.process.findUnique({
      where: { id: processId },
      include: { item: true },
    });

    if (!process) {
      return { error: "Process not found" };
    }

    // --- Server-side guards ---
    // 1. Raw materials must be RELEASE_TO_PRODUCTION to start a process
    if (newStatus === "IN_PROGRESS" && process.item.rawMaterials !== "RELEASE_TO_PRODUCTION") {
      return { error: "Cannot start process — raw materials not released for production." };
    }

    // 2. Sequential enforcement: previous process must be COMPLETED before starting next
    if (newStatus === "IN_PROGRESS") {
      const previousProcess = await prisma.process.findFirst({
        where: { itemId: process.itemId, order: process.order - 1 },
        select: { status: true, name: true },
      });
      if (previousProcess && previousProcess.status !== "COMPLETED") {
        return { error: `Cannot start — previous process "${previousProcess.name}" is not yet completed.` };
      }
    }

    // 3. If item is already REJECTED, no new process actions allowed
    if (process.item.status === "REJECTED" && newStatus === "IN_PROGRESS") {
      return { error: "Cannot start process — item has been rejected." };
    }

    // Record the old status for update tracking
    const oldStatus = process.status;

    // Update the process
    const updatedProcess = await prisma.process.update({
      where: { id: processId },
      data: {
        status: newStatus as any,
        startedAt: newStatus === "IN_PROGRESS" && !process.startedAt ? new Date() : process.startedAt,
        completedAt: (newStatus === "COMPLETED" || newStatus === "REJECTED") ? new Date() : null,
      },
    });

    // Create process update record
    await prisma.processUpdate.create({
      data: {
        processId: processId,
        userId: session.user.id,
        oldStatus: oldStatus as any,
        newStatus: newStatus as any,
      },
    });

    // Auto-update item status based on process changes
    if (newStatus === "IN_PROGRESS" && process.item.status === "PENDING") {
      await prisma.item.update({
        where: { id: process.itemId },
        data: { status: "IN_PROGRESS" },
      });
    }

    let itemCompleted = false;
    let itemRejected = false;

    if (newStatus === "COMPLETED") {
      // ── Deduct materials consumed by this process ──────────────────────
      const materialUsages = await prisma.processMaterialUsage.findMany({
        where: { processId },
        include: { inventoryItem: true },
      });

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

      // ── Check if all processes done → mark item COMPLETED ──────────────
      const siblings = await prisma.process.findMany({
        where: { itemId: process.itemId },
        select: { status: true },
      });
      if (siblings.every((p) => p.status === "COMPLETED")) {
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

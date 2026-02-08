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

    // Record the old status for update tracking
    const oldStatus = process.status;

    // Update the process
    const updatedProcess = await prisma.process.update({
      where: { id: processId },
      data: {
        status: newStatus as any,
        startedAt: newStatus === "IN_PROGRESS" && !process.startedAt ? new Date() : process.startedAt,
        completedAt: newStatus === "COMPLETED" ? new Date() : null,
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

    revalidatePath("/dashboard/my-processes");
    revalidatePath("/dashboard/employee");
    revalidatePath(`/dashboard/items/${process.itemId}`);
    return { success: true, process: updatedProcess };
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

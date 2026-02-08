"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createAssignment(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ENCODER") {
    return { error: "Unauthorized - Encoder only" };
  }

  try {
    const itemId = formData.get("itemId") as string;
    const userId = formData.get("userId") as string;

    if (!itemId || !userId) {
      return { error: "Item and user are required" };
    }

    // Check if assignment already exists
    const existing = await prisma.itemAssignment.findUnique({
      where: {
        itemId_userId: {
          itemId,
          userId,
        },
      },
    });

    if (existing) {
      return { error: "User is already assigned to this item" };
    }

    await prisma.itemAssignment.create({
      data: {
        itemId,
        userId,
      },
    });

    revalidatePath("/dashboard/assignments");
    revalidatePath("/dashboard/encoder");
    return { success: true };
  } catch (error) {
    console.error("Error creating assignment:", error);
    return { error: "Failed to create assignment" };
  }
}

export async function removeAssignment(assignmentId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ENCODER") {
    return { error: "Unauthorized - Encoder only" };
  }

  try {
    await prisma.itemAssignment.delete({
      where: { id: assignmentId },
    });

    revalidatePath("/dashboard/assignments");
    return { success: true };
  } catch (error) {
    console.error("Error removing assignment:", error);
    return { error: "Failed to remove assignment" };
  }
}

"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addItemNote(itemId: string, content: string) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const trimmed = content.trim();
  if (!trimmed) return { error: "Note cannot be empty" };

  try {
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) return { error: "Item not found" };

    await prisma.note.create({
      data: { content: trimmed, itemId, userId: session.user.id },
    });

    revalidatePath("/dashboard/encoder");
    revalidatePath("/dashboard/employee");
    revalidatePath(`/dashboard/items/${itemId}`);
    return { success: true };
  } catch (error) {
    console.error("Error adding item note:", error);
    return { error: "Failed to add note" };
  }
}

export async function addProcessNoteEntry(processId: string, content: string) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const trimmed = content.trim();
  if (!trimmed) return { error: "Note cannot be empty" };

  try {
    const process = await prisma.process.findUnique({
      where: { id: processId },
      select: { itemId: true },
    });
    if (!process) return { error: "Process not found" };

    await prisma.note.create({
      data: { content: trimmed, processId, userId: session.user.id },
    });

    revalidatePath("/dashboard/encoder");
    revalidatePath("/dashboard/employee");
    revalidatePath(`/dashboard/items/${process.itemId}`);
    return { success: true };
  } catch (error) {
    console.error("Error adding process note:", error);
    return { error: "Failed to add note" };
  }
}

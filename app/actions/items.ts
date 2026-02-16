"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createItem(prevState: any, formData: FormData) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "ENCODER")) {
    return { error: "Unauthorized" };
  }

  try {
    const itemNumber = formData.get("itemNumber") as string;
    const name = formData.get("name") as string;
    const type = formData.get("type") as string;
    const quantity = parseInt(formData.get("quantity") as string);
    const customer = formData.get("customer") as string;
    const departmentId = formData.get("departmentId") as string;
    const targetOutput = parseInt(formData.get("targetOutput") as string);
    const deadline = new Date(formData.get("deadline") as string);
    const color = formData.get("color") as string || null;
    const rawMaterials = (formData.get("rawMaterials") as string) || "SHORT";

    // Validate type
    if (!["FOLDED", "SHEETED", "STITCHING"].includes(type)) {
      return { error: "Invalid item type. Must be FOLDED, SHEETED, or STITCHING." };
    }

    // Validate raw materials status
    if (!["AVAILABLE", "DONE", "PROCESSING", "SHORT"].includes(rawMaterials)) {
      return { error: "Invalid raw materials status." };
    }

    // Check if item number already exists
    const existing = await prisma.item.findUnique({
      where: { itemNumber },
    });

    if (existing) {
      return { error: "Item number already exists" };
    }

    const item = await prisma.item.create({
      data: {
        itemNumber,
        name,
        type: type as any,
        quantity,
        customer,
        departmentId,
        targetOutput,
        deadline,
        color,
        rawMaterials: rawMaterials as any,
        status: "PENDING",
        currentOutput: 0,
      },
    });

    revalidatePath("/dashboard/items");
    revalidatePath("/dashboard/encoder");
    return { success: true, itemId: item.id };
  } catch (error) {
    console.error("Error creating item:", error);
    return { error: "Failed to create item" };
  }
}

export async function updateItemStatus(itemId: string, status: string) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "ENCODER")) {
    return { error: "Unauthorized" };
  }

  try {
    await prisma.item.update({
      where: { id: itemId },
      data: { status: status as any },
    });

    revalidatePath("/dashboard/items");
    revalidatePath(`/dashboard/items/${itemId}`);
    return { success: true };
  } catch (error) {
    console.error("Error updating item status:", error);
    return { error: "Failed to update status" };
  }
}

export async function updateItemOutput(itemId: string, currentOutput: number) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  try {
    await prisma.item.update({
      where: { id: itemId },
      data: { currentOutput },
    });

    revalidatePath("/dashboard/items");
    revalidatePath(`/dashboard/items/${itemId}`);
    revalidatePath("/dashboard/my-items");
    return { success: true };
  } catch (error) {
    console.error("Error updating item output:", error);
    return { error: "Failed to update output" };
  }
}

export async function deleteItem(itemId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Unauthorized - Admin only" };
  }

  try {
    await prisma.item.delete({
      where: { id: itemId },
    });

    revalidatePath("/dashboard/items");
    redirect("/dashboard/items");
  } catch (error) {
    console.error("Error deleting item:", error);
    return { error: "Failed to delete item" };
  }
}

export async function updateRawMaterials(itemId: string, rawMaterials: string) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "ENCODER")) {
    return { error: "Unauthorized" };
  }

  if (!["AVAILABLE", "DONE", "PROCESSING", "SHORT"].includes(rawMaterials)) {
    return { error: "Invalid raw materials status" };
  }

  try {
    await prisma.item.update({
      where: { id: itemId },
      data: { rawMaterials: rawMaterials as any },
    });

    revalidatePath("/dashboard/items");
    revalidatePath(`/dashboard/items/${itemId}`);
    revalidatePath("/dashboard/encoder");
    return { success: true };
  } catch (error) {
    console.error("Error updating raw materials:", error);
    return { error: "Failed to update raw materials" };
  }
}

export async function updateItem(prevState: any, formData: FormData) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "ENCODER")) {
    return { error: "Unauthorized" };
  }

  try {
    const itemId = formData.get("itemId") as string;
    const name = formData.get("name") as string;
    const type = formData.get("type") as string;
    const quantity = parseInt(formData.get("quantity") as string);
    const customer = formData.get("customer") as string;
    const departmentId = formData.get("departmentId") as string;
    const targetOutput = parseInt(formData.get("targetOutput") as string);
    const deadline = new Date(formData.get("deadline") as string);
    const color = formData.get("color") as string || null;
    const rawMaterials = (formData.get("rawMaterials") as string) || "SHORT";

    if (!["FOLDED", "SHEETED", "STITCHING"].includes(type)) {
      return { error: "Invalid item type." };
    }

    if (!["AVAILABLE", "DONE", "PROCESSING", "SHORT"].includes(rawMaterials)) {
      return { error: "Invalid raw materials status." };
    }

    await prisma.item.update({
      where: { id: itemId },
      data: {
        name,
        type: type as any,
        quantity,
        customer,
        departmentId,
        targetOutput,
        deadline,
        color,
        rawMaterials: rawMaterials as any,
      },
    });

    revalidatePath("/dashboard/items");
    revalidatePath(`/dashboard/items/${itemId}`);
    revalidatePath("/dashboard/encoder");
    return { success: true };
  } catch (error) {
    console.error("Error updating item:", error);
    return { error: "Failed to update item" };
  }
}

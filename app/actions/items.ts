"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { PROCESS_TEMPLATES } from "@/lib/constants/processes";

export async function quickGenerateItem(data: {
  type: string;
  name: string;
  customer: string;
  quantity: number;
  targetOutput: number;
  color?: string;
  rawMaterials?: string;
  deadline?: string;
}) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "ENCODER")) {
    return { error: "Unauthorized" };
  }

  if (!["FOLDED", "SHEETED", "STITCHING"].includes(data.type)) {
    return { error: "Invalid item type" };
  }

  try {
    const department = await prisma.department.findFirst({ where: { type: "MANUAL" } });
    if (!department) return { error: "Manual department not found. Please set up the Manual department first." };

    // Generate item number: MAN-YYYYMMDD-NNN
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay   = new Date(now); endOfDay.setHours(23, 59, 59, 999);
    const todayCount = await prisma.item.count({ where: { createdAt: { gte: startOfDay, lte: endOfDay } } });
    const seq = String(todayCount + 1).padStart(3, "0");
    const itemNumber = `MAN-${dateStr}-${seq}`;

    const deadline = data.deadline ? new Date(data.deadline) : new Date(Date.now() + 7 * 86400000);

    const rawMaterials = data.rawMaterials && ["APPROVAL", "RELEASE_TO_PRODUCTION", "NOT_AVAILABLE"].includes(data.rawMaterials)
      ? data.rawMaterials
      : "NOT_AVAILABLE";

    const item = await prisma.item.create({
      data: {
        itemNumber,
        name: data.name || `${data.type} Job`,
        type: data.type as any,
        quantity: data.quantity || 1,
        customer: data.customer || "TBD",
        departmentId: department.id,
        targetOutput: data.targetOutput || 0,
        deadline,
        color: data.color || null,
        rawMaterials: rawMaterials as any,
        status: "PENDING",
        currentOutput: 0,
      },
    });

    const template = PROCESS_TEMPLATES[data.type];
    if (template) {
      await prisma.process.createMany({
        data: template.map((processName, index) => ({
          name: processName,
          order: index + 1,
          itemId: item.id,
        })),
      });
    }

    revalidatePath("/dashboard/items");
    revalidatePath("/dashboard/encoder");
    revalidatePath("/dashboard/employee");
    return { success: true, itemId: item.id, itemNumber };
  } catch (error) {
    console.error("Error generating item:", error);
    return { error: "Failed to generate item" };
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

  if (!["APPROVAL", "RELEASE_TO_PRODUCTION", "NOT_AVAILABLE"].includes(rawMaterials)) {
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
    const rawMaterials = (formData.get("rawMaterials") as string) || "NOT_AVAILABLE";

    if (!["FOLDED", "SHEETED", "STITCHING"].includes(type)) {
      return { error: "Invalid item type." };
    }

    if (!["APPROVAL", "RELEASE_TO_PRODUCTION", "NOT_AVAILABLE"].includes(rawMaterials)) {
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

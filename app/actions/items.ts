"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { PROCESS_TEMPLATES, PROCESS_MATERIAL_TEMPLATES } from "@/lib/constants/processes";

export async function quickGenerateItem(data: {
  type: string;
  name: string;
  customer: string;
  quantity: number;
  targetOutput: number;
  color?: string;
  rawMaterials?: string;
  estimatedDuration?: number;
  deadline?: string;
  machines?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "ENCODER")) {
      return { error: "Unauthorized" };
    }

    if (!["FOLDED", "SHEETED", "STITCHING"].includes(data.type)) {
      return { error: "Invalid item type" };
    }

    const department = await prisma.department.findFirst({ where: { type: "MANUAL" } });
    if (!department) return { error: "Manual department not found. Please set up the Manual department first." };

    // Generate item number: MAN-YYYYMMDD-NNN
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    
    // Find the highest sequence number used today (handles deleted items correctly)
    const todayPrefix = `MAN-${dateStr}-`;
    const lastItem = await prisma.item.findFirst({
      where: { itemNumber: { startsWith: todayPrefix } },
      orderBy: { itemNumber: "desc" },
      select: { itemNumber: true },
    });
    let nextSeq = 1;
    if (lastItem) {
      const lastSeq = parseInt(lastItem.itemNumber.split("-").pop() || "0", 10);
      nextSeq = lastSeq + 1;
    }
    const seq = String(nextSeq).padStart(3, "0");
    const itemNumber = `${todayPrefix}${seq}`;

    const deadline = data.deadline ? new Date(data.deadline) : new Date(Date.now() + 7 * 86400000);

    const rawMaterials = data.rawMaterials && ["AVAILABLE", "NOT_SUFFICIENT", "RELEASE_TO_PRODUCTION", "OUT_OF_STOCK"].includes(data.rawMaterials)
      ? data.rawMaterials
      : "AVAILABLE";

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
        machines: data.machines || null,
        rawMaterials: rawMaterials as any,
        estimatedDuration: data.estimatedDuration ?? null,
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

      // Attach material usages to each process based on PROCESS_MATERIAL_TEMPLATES
      const createdProcesses = await prisma.process.findMany({
        where: { itemId: item.id },
        select: { id: true, name: true },
      });

      const usageRows: { processId: string; inventoryItemId: string; requiredQty: number }[] = [];
      for (const process of createdProcesses) {
        const matTemplates = PROCESS_MATERIAL_TEMPLATES[process.name] ?? [];
        for (const tmpl of matTemplates) {
          // ifColor: skip if item color does not match
          if (tmpl.ifColor !== undefined && data.color !== tmpl.ifColor) continue;
          // excludeIfColor: skip if item color matches the exclusion
          if (tmpl.excludeIfColor !== undefined && data.color === tmpl.excludeIfColor) continue;

          const invItem = await prisma.inventoryItem.findFirst({
            where: { name: tmpl.materialName },
            select: { id: true },
          });
          if (!invItem) continue; // material not seeded yet — skip silently

          usageRows.push({
            processId: process.id,
            inventoryItemId: invItem.id,
            requiredQty: tmpl.qtyFormula(data.targetOutput || 0),
          });
        }
      }

      if (usageRows.length > 0) {
        await prisma.processMaterialUsage.createMany({ data: usageRows });
      }
    }

    revalidatePath("/dashboard/items");
    revalidatePath("/dashboard/encoder");
    revalidatePath("/dashboard/employee");
    return { success: true, itemId: item.id, itemNumber };
  } catch (error) {
    console.error("Error generating item:", error);
    const message = error instanceof Error ? error.message : String(error);
    return { error: `Failed to generate item: ${message}` };
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
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "ENCODER")) {
    return { error: "Unauthorized" };
  }

  try {
    await prisma.item.delete({
      where: { id: itemId },
    });

    revalidatePath("/dashboard/items");
    revalidatePath("/dashboard/encoder");
    revalidatePath("/dashboard/employee");
    return { success: true };
  } catch (error) {
    console.error("Error deleting item:", error);
    return { error: "Failed to delete item" };
  }
}

export async function updateRawMaterials(itemId: string, rawMaterials: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
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

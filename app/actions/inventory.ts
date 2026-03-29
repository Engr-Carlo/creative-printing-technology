"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ─── Read ──────────────────────────────────────────────────────────────────

export async function getInventoryItems() {
  return prisma.inventoryItem.findMany({
    include: {
      _count: { select: { usages: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getItemMaterials(itemId: string) {
  return prisma.itemMaterialUsage.findMany({
    where: { itemId },
    include: { inventoryItem: true },
    orderBy: { inventoryItem: { name: "asc" } },
  });
}

// ─── Inventory CRUD ────────────────────────────────────────────────────────

export async function createInventoryItem(data: {
  name: string;
  description?: string;
  unit: string;
  currentStock: number;
  minStock: number;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return { error: "Unauthorized" };

  try {
    const item = await prisma.inventoryItem.create({ data });
    revalidatePath("/dashboard/inventory");
    return { success: true, id: item.id };
  } catch {
    return { error: "Failed to create material" };
  }
}

export async function updateInventoryItem(
  id: string,
  data: { name?: string; description?: string; unit?: string; minStock?: number }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return { error: "Unauthorized" };

  try {
    await prisma.inventoryItem.update({ where: { id }, data });
    revalidatePath("/dashboard/inventory");
    return { success: true };
  } catch {
    return { error: "Failed to update material" };
  }
}

export async function deleteInventoryItem(id: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return { error: "Unauthorized" };

  try {
    await prisma.inventoryItem.delete({ where: { id } });
    revalidatePath("/dashboard/inventory");
    return { success: true };
  } catch {
    return { error: "Failed to delete material" };
  }
}

// ─── Stock adjustments ─────────────────────────────────────────────────────

export async function restockInventoryItem(id: string, qty: number, note?: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return { error: "Unauthorized" };
  if (qty <= 0) return { error: "Quantity must be positive" };

  try {
    await prisma.$transaction([
      prisma.inventoryItem.update({
        where: { id },
        data: { currentStock: { increment: qty } },
      }),
      prisma.inventoryTransaction.create({
        data: {
          type: "RESTOCK",
          quantity: qty,
          note: note || null,
          inventoryItemId: id,
          performedById: session.user.id,
        },
      }),
    ]);

    // Re-check all JRs that require this material
    await recheckAllItemsForMaterial(id);

    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/items");
    return { success: true };
  } catch {
    return { error: "Failed to restock" };
  }
}

export async function adjustInventoryStock(id: string, newStock: number, note?: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return { error: "Unauthorized" };
  if (newStock < 0) return { error: "Stock cannot be negative" };

  const inv = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!inv) return { error: "Material not found" };

  const diff = newStock - inv.currentStock;

  try {
    await prisma.$transaction([
      prisma.inventoryItem.update({
        where: { id },
        data: { currentStock: newStock },
      }),
      prisma.inventoryTransaction.create({
        data: {
          type: "ADJUSTMENT",
          quantity: diff,
          note: note || null,
          inventoryItemId: id,
          performedById: session.user.id,
        },
      }),
    ]);

    await recheckAllItemsForMaterial(id);

    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/items");
    return { success: true };
  } catch {
    return { error: "Failed to adjust stock" };
  }
}

// ─── Item material requirements ────────────────────────────────────────────

export async function addItemMaterialRequirement(
  itemId: string,
  inventoryItemId: string,
  requiredQty: number
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return { error: "Unauthorized" };
  if (requiredQty <= 0) return { error: "Required quantity must be positive" };

  try {
    await prisma.itemMaterialUsage.upsert({
      where: { itemId_inventoryItemId: { itemId, inventoryItemId } },
      create: { itemId, inventoryItemId, requiredQty },
      update: { requiredQty },
    });

    await recheckItemMaterials(itemId);
    revalidatePath(`/dashboard/items/${itemId}`);
    return { success: true };
  } catch {
    return { error: "Failed to add requirement" };
  }
}

export async function removeItemMaterialRequirement(itemId: string, inventoryItemId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return { error: "Unauthorized" };

  try {
    await prisma.itemMaterialUsage.delete({
      where: { itemId_inventoryItemId: { itemId, inventoryItemId } },
    });

    await recheckItemMaterials(itemId);
    revalidatePath(`/dashboard/items/${itemId}`);
    return { success: true };
  } catch {
    return { error: "Failed to remove requirement" };
  }
}

export async function releaseItemToProduction(itemId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return { error: "Unauthorized" };

  // Aggregate required quantities from not-yet-completed processes to warn admin
  const processUsages = await prisma.processMaterialUsage.findMany({
    where: { process: { itemId, status: { notIn: ["COMPLETED", "REJECTED"] } } },
    include: { inventoryItem: true },
  });
  const needed = new Map<string, { name: string; stock: number; required: number }>();
  for (const u of processUsages) {
    const ex = needed.get(u.inventoryItemId);
    if (ex) {
      ex.required += u.requiredQty;
    } else {
      needed.set(u.inventoryItemId, {
        name: u.inventoryItem.name,
        stock: u.inventoryItem.currentStock,
        required: u.requiredQty,
      });
    }
  }
  const insufficient = [...needed.values()].filter((n) => n.stock < n.required);

  try {
    // Only update status — materials are deducted per-process as each completes
    await prisma.item.update({
      where: { id: itemId },
      data: { rawMaterials: "RELEASE_TO_PRODUCTION" as any },
    });

    revalidatePath(`/dashboard/items/${itemId}`);
    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/items");

    return {
      success: true,
      warning:
        insufficient.length > 0
          ? `${insufficient.map((n) => n.name).join(", ")} may have insufficient stock when processes run.`
          : undefined,
    };
  } catch {
    return { error: "Failed to release to production" };
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Re-evaluates the rawMaterials status of a single item based on the total
 * required quantities of its not-yet-completed processes vs current stock.
 * Will NOT downgrade an item that's already RELEASE_TO_PRODUCTION.
 */
async function recheckItemMaterials(itemId: string) {
  // Sum required quantities from processes that are not yet completed/rejected
  const activeUsages = await prisma.processMaterialUsage.findMany({
    where: {
      process: {
        itemId,
        status: { notIn: ["COMPLETED", "REJECTED"] },
      },
    },
    include: { inventoryItem: true },
  });

  if (activeUsages.length === 0) return;

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { rawMaterials: true },
  });
  if (item?.rawMaterials === "RELEASE_TO_PRODUCTION") return;

  // Aggregate needed qty per inventory item
  const needed = new Map<string, { stock: number; required: number }>();
  for (const u of activeUsages) {
    const ex = needed.get(u.inventoryItemId);
    if (ex) {
      ex.required += u.requiredQty;
    } else {
      needed.set(u.inventoryItemId, {
        stock: u.inventoryItem.currentStock,
        required: u.requiredQty,
      });
    }
  }

  let newStatus = "AVAILABLE";
  for (const { stock, required } of needed.values()) {
    if (stock <= 0) {
      newStatus = "OUT_OF_STOCK";
      break;
    } else if (stock < required) {
      newStatus = "NOT_SUFFICIENT";
    }
  }

  await prisma.item.update({
    where: { id: itemId },
    data: { rawMaterials: newStatus as any },
  });
}

/**
 * After a stock change, re-check all items whose pending processes require this material.
 */
async function recheckAllItemsForMaterial(inventoryItemId: string) {
  const processUsages = await prisma.processMaterialUsage.findMany({
    where: { inventoryItemId },
    select: { process: { select: { itemId: true } } },
  });
  const itemIds = [...new Set(processUsages.map((u) => u.process.itemId))];
  await Promise.all(itemIds.map(recheckItemMaterials));
}

// ─── Encoder: set material requirements ───────────────────────────────────

/**
 * Replace all material requirements for an item.
 * Accessible by both ADMIN and ENCODER.
 * Automatically recomputes rawMaterials status afterwards.
 */
export async function setItemMaterialRequirements(
  itemId: string,
  requirements: Array<{ inventoryItemId: string; requiredQty: number }>
) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "ENCODER")) {
    return { error: "Unauthorized" };
  }
  for (const r of requirements) {
    if (r.requiredQty <= 0) return { error: "Required quantity must be positive" };
  }

  try {
    // Replace all requirements atomically
    await prisma.$transaction([
      prisma.itemMaterialUsage.deleteMany({ where: { itemId } }),
      ...(requirements.length > 0
        ? [
            prisma.itemMaterialUsage.createMany({
              data: requirements.map((r) => ({
                itemId,
                inventoryItemId: r.inventoryItemId,
                requiredQty: r.requiredQty,
              })),
            }),
          ]
        : []),
    ]);

    await recheckItemMaterials(itemId);

    revalidatePath(`/dashboard/items/${itemId}`);
    revalidatePath("/dashboard/items");
    revalidatePath("/dashboard/encoder");
    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { error: "Failed to set material requirements" };
  }
}

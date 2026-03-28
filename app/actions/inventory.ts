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

  const usages = await prisma.itemMaterialUsage.findMany({
    where: { itemId },
    include: { inventoryItem: true },
  });

  // Warn if any material is insufficient (but still allow — admin override)
  const insufficient = usages.filter(
    (u) => u.inventoryItem.currentStock < u.requiredQty
  );

  try {
    await prisma.$transaction([
      // Deduct all required materials from inventory
      ...usages.map((u) =>
        prisma.inventoryItem.update({
          where: { id: u.inventoryItemId },
          data: { currentStock: { decrement: u.requiredQty } },
        })
      ),
      // Log each deduction
      ...usages.map((u) =>
        prisma.inventoryTransaction.create({
          data: {
            type: "DEDUCT",
            quantity: -u.requiredQty,
            note: `Released to production — JR ${itemId}`,
            inventoryItemId: u.inventoryItemId,
            performedById: session.user.id,
          },
        })
      ),
      // Mark item as released
      prisma.item.update({
        where: { id: itemId },
        data: { rawMaterials: "RELEASE_TO_PRODUCTION" as any },
      }),
    ]);

    revalidatePath(`/dashboard/items/${itemId}`);
    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/items");

    return {
      success: true,
      warning:
        insufficient.length > 0
          ? `${insufficient.map((u) => u.inventoryItem.name).join(", ")} had insufficient stock — released anyway.`
          : undefined,
    };
  } catch {
    return { error: "Failed to release to production" };
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Re-evaluates the rawMaterials status of a single item
 * based on its current material requirements vs. inventory stock.
 * Will NOT downgrade an item that's already RELEASE_TO_PRODUCTION.
 */
async function recheckItemMaterials(itemId: string) {
  const usages = await prisma.itemMaterialUsage.findMany({
    where: { itemId },
    include: { inventoryItem: true },
  });

  if (usages.length === 0) return;

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { rawMaterials: true },
  });
  if (item?.rawMaterials === "RELEASE_TO_PRODUCTION") return;

  let newStatus = "AVAILABLE";
  for (const u of usages) {
    const stock = u.inventoryItem.currentStock;
    if (stock <= 0) {
      newStatus = "OUT_OF_STOCK";
      break;
    } else if (stock < u.requiredQty) {
      newStatus = "NOT_SUFFICIENT";
    }
  }

  await prisma.item.update({
    where: { id: itemId },
    data: { rawMaterials: newStatus as any },
  });
}

/**
 * After a stock change, re-check all items that require this material.
 */
async function recheckAllItemsForMaterial(inventoryItemId: string) {
  const usages = await prisma.itemMaterialUsage.findMany({
    where: { inventoryItemId },
    select: { itemId: true },
  });
  await Promise.all(usages.map((u) => recheckItemMaterials(u.itemId)));
}

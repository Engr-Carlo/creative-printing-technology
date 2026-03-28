-- ============================================================
-- Inventory System Migration
-- Run this in your Supabase SQL Editor (or psql) BEFORE running
-- `npx prisma db push` / `npx prisma generate`.
-- ============================================================

-- 1. InventoryItem table
CREATE TABLE IF NOT EXISTS "InventoryItem" (
  "id"           TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "description"  TEXT,
  "unit"         TEXT NOT NULL,
  "currentStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "minStock"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InventoryItem_name_idx" ON "InventoryItem"("name");

-- 2. ItemMaterialUsage table
CREATE TABLE IF NOT EXISTS "ItemMaterialUsage" (
  "id"              TEXT NOT NULL,
  "requiredQty"     DOUBLE PRECISION NOT NULL,
  "itemId"          TEXT NOT NULL,
  "inventoryItemId" TEXT NOT NULL,
  CONSTRAINT "ItemMaterialUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ItemMaterialUsage_itemId_inventoryItemId_key"
  ON "ItemMaterialUsage"("itemId", "inventoryItemId");

CREATE INDEX IF NOT EXISTS "ItemMaterialUsage_inventoryItemId_idx"
  ON "ItemMaterialUsage"("inventoryItemId");

ALTER TABLE "ItemMaterialUsage"
  ADD CONSTRAINT "ItemMaterialUsage_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ItemMaterialUsage"
  ADD CONSTRAINT "ItemMaterialUsage_inventoryItemId_fkey"
  FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. InventoryTransaction table
CREATE TABLE IF NOT EXISTS "InventoryTransaction" (
  "id"              TEXT NOT NULL,
  "type"            TEXT NOT NULL,
  "quantity"        DOUBLE PRECISION NOT NULL,
  "note"            TEXT,
  "inventoryItemId" TEXT NOT NULL,
  "performedById"   TEXT NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InventoryTransaction_inventoryItemId_createdAt_idx"
  ON "InventoryTransaction"("inventoryItemId", "createdAt");

CREATE INDEX IF NOT EXISTS "InventoryTransaction_performedById_idx"
  ON "InventoryTransaction"("performedById");

ALTER TABLE "InventoryTransaction"
  ADD CONSTRAINT "InventoryTransaction_inventoryItemId_fkey"
  FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryTransaction"
  ADD CONSTRAINT "InventoryTransaction_performedById_fkey"
  FOREIGN KEY ("performedById") REFERENCES "User"("id") ON UPDATE CASCADE;

-- ============================================================
-- Raw Materials Enum Migration
-- Run this in your Supabase SQL Editor (or psql) BEFORE running
-- `prisma db push` / `prisma generate`.
--
-- What this does:
--   1. Adds the four new enum values to RawMaterialStatus
--   2. Migrates existing rows:
--        APPROVAL      → AVAILABLE
--        NOT_AVAILABLE → NOT_SUFFICIENT
--   3. The old values (APPROVAL, NOT_AVAILABLE) remain in the
--      PostgreSQL enum type for safety but are no longer used.
-- ============================================================

-- Step 1: Add new enum values (safe to run multiple times)
ALTER TYPE "RawMaterialStatus" ADD VALUE IF NOT EXISTS 'AVAILABLE';
ALTER TYPE "RawMaterialStatus" ADD VALUE IF NOT EXISTS 'NOT_SUFFICIENT';
ALTER TYPE "RawMaterialStatus" ADD VALUE IF NOT EXISTS 'OUT_OF_STOCK';

-- Step 2: Migrate existing data to new values
UPDATE "Item" SET "rawMaterials" = 'AVAILABLE'      WHERE "rawMaterials" = 'APPROVAL';
UPDATE "Item" SET "rawMaterials" = 'NOT_SUFFICIENT' WHERE "rawMaterials" = 'NOT_AVAILABLE';

-- Step 3: Update the column default (if any)
ALTER TABLE "Item" ALTER COLUMN "rawMaterials" SET DEFAULT 'AVAILABLE';

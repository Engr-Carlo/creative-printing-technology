-- Migration: Update enums, Note model changes
-- Run this against your Supabase PostgreSQL database

-- 1. Replace RawMaterialStatus enum (AVAILABLE, DONE, PROCESSING, SHORT → APPROVAL, RELEASE_TO_PRODUCTION, NOT_AVAILABLE)
ALTER TYPE "RawMaterialStatus" RENAME TO "RawMaterialStatus_old";
CREATE TYPE "RawMaterialStatus" AS ENUM ('APPROVAL', 'RELEASE_TO_PRODUCTION', 'NOT_AVAILABLE');

-- Migrate existing data
ALTER TABLE "Item" ALTER COLUMN "rawMaterials" TYPE TEXT;
UPDATE "Item" SET "rawMaterials" = 'NOT_AVAILABLE' WHERE "rawMaterials" = 'SHORT';
UPDATE "Item" SET "rawMaterials" = 'RELEASE_TO_PRODUCTION' WHERE "rawMaterials" = 'AVAILABLE';
UPDATE "Item" SET "rawMaterials" = 'RELEASE_TO_PRODUCTION' WHERE "rawMaterials" = 'DONE';
UPDATE "Item" SET "rawMaterials" = 'APPROVAL' WHERE "rawMaterials" = 'PROCESSING';
ALTER TABLE "Item" ALTER COLUMN "rawMaterials" TYPE "RawMaterialStatus" USING "rawMaterials"::"RawMaterialStatus";
ALTER TABLE "Item" ALTER COLUMN "rawMaterials" SET DEFAULT 'NOT_AVAILABLE';
DROP TYPE "RawMaterialStatus_old";

-- 2. Remove DELAYED from ItemStatus enum
ALTER TYPE "ItemStatus" RENAME TO "ItemStatus_old";
CREATE TYPE "ItemStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- Migrate any DELAYED items to IN_PROGRESS
ALTER TABLE "Item" ALTER COLUMN "status" TYPE TEXT;
UPDATE "Item" SET "status" = 'IN_PROGRESS' WHERE "status" = 'DELAYED';
ALTER TABLE "Item" ALTER COLUMN "status" TYPE "ItemStatus" USING "status"::"ItemStatus";
ALTER TABLE "Item" ALTER COLUMN "status" SET DEFAULT 'PENDING';
DROP TYPE "ItemStatus_old";

-- 3. Note model: Make itemId optional, add processId
ALTER TABLE "Note" ALTER COLUMN "itemId" DROP NOT NULL;
ALTER TABLE "Note" ADD COLUMN "processId" TEXT;
ALTER TABLE "Note" ADD CONSTRAINT "Note_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Note_processId_createdAt_idx" ON "Note"("processId", "createdAt");

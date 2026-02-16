-- Migration SQL for Production Database
-- Run this in Supabase SQL Editor to update production schema

-- Step 1: Create new enums
CREATE TYPE "ItemType" AS ENUM ('FOLDED', 'SHEETED', 'STITCHING');
CREATE TYPE "RawMaterialStatus" AS ENUM ('AVAILABLE', 'DONE', 'PROCESSING', 'SHORT');

-- Step 2: Add rawMaterials column with default value
ALTER TABLE "Item" ADD COLUMN "rawMaterials" "RawMaterialStatus" NOT NULL DEFAULT 'SHORT';

-- Step 3: Add temporary column for new type
ALTER TABLE "Item" ADD COLUMN "type_new" "ItemType";

-- Step 4: Migrate existing data (update these mappings based on your current data)
-- If you have items with type values that don't match FOLDED/SHEETED/STITCHING,
-- you'll need to update them first or adjust this mapping
UPDATE "Item" SET "type_new" = 
  CASE 
    WHEN UPPER("type") = 'FOLDED' THEN 'FOLDED'::"ItemType"
    WHEN UPPER("type") = 'SHEETED' THEN 'SHEETED'::"ItemType"
    WHEN UPPER("type") = 'STITCHING' OR UPPER("type") = 'STITCHED' THEN 'STITCHING'::"ItemType"
    ELSE 'FOLDED'::"ItemType"  -- Default fallback
  END;

-- Step 5: Drop old type column
ALTER TABLE "Item" DROP COLUMN "type";

-- Step 6: Rename new column to type
ALTER TABLE "Item" RENAME COLUMN "type_new" TO "type";

-- Step 7: Make type column NOT NULL
ALTER TABLE "Item" ALTER COLUMN "type" SET NOT NULL;

-- Verification query - check the results
SELECT id, "itemNumber", name, type, "rawMaterials" FROM "Item" LIMIT 10;

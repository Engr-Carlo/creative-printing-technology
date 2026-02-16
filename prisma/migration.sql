-- Migration SQL for Production Database
-- Run this in Supabase SQL Editor to update production schema

-- Step 1: Create new enums (skip if already exists)
DO $$ BEGIN
  CREATE TYPE "ItemType" AS ENUM ('FOLDED', 'SHEETED', 'STITCHING');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "RawMaterialStatus" AS ENUM ('AVAILABLE', 'DONE', 'PROCESSING', 'SHORT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add rawMaterials column with default value (skip if already exists)
DO $$ BEGIN
  ALTER TABLE "Item" ADD COLUMN "rawMaterials" "RawMaterialStatus" NOT NULL DEFAULT 'SHORT';
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Step 3: Add temporary column for new type (only if type is still text)
DO $$ BEGIN
  -- Check if type column is NOT already an enum
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Item' 
    AND column_name = 'type' 
    AND data_type IN ('character varying', 'text')
  ) THEN
    ALTER TABLE "Item" ADD COLUMN "type_new" "ItemType";
    
    -- Step 4: Migrate existing data
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
  END IF;
END $$;

-- Verification query - check the results
SELECT id, "itemNumber", name, type, "rawMaterials" FROM "Item" LIMIT 10;

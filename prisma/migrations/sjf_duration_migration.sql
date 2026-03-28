-- ============================================================
-- SJF Scheduling: Add estimatedDuration to Item
-- Run this in your Supabase SQL Editor BEFORE npx prisma db push
-- ============================================================

ALTER TABLE "Item"
  ADD COLUMN IF NOT EXISTS "estimatedDuration" INTEGER DEFAULT NULL;

COMMENT ON COLUMN "Item"."estimatedDuration" IS
  'Estimated total processing time in minutes. Used by the SJF scheduler.';

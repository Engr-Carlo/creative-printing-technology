"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function runDatabaseMigration() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Unauthorized — Admin only" };
  }

  const results: string[] = [];

  try {
    // 1. Add REJECTED to ProcessStatus enum (safe — does nothing if already exists)
    await prisma.$executeRaw`ALTER TYPE "ProcessStatus" ADD VALUE IF NOT EXISTS 'REJECTED'`;
    results.push("✅ ProcessStatus enum: REJECTED value ensured");
  } catch (e: any) {
    // Already exists or other harmless error
    results.push(`⚠️ Enum step: ${e.message?.split("\n")[0] ?? "skipped"}`);
  }

  try {
    // 2. Rename "Pre Fold" → "Pre-Fold/Inspection"
    const renamed = await prisma.$executeRaw`UPDATE "Process" SET name = 'Pre-Fold/Inspection' WHERE name = 'Pre Fold'`;
    results.push(`✅ Renamed ${renamed} process record(s) from "Pre Fold" → "Pre-Fold/Inspection"`);
  } catch (e: any) {
    results.push(`❌ Rename step failed: ${e.message?.split("\n")[0]}`);
  }

  try {
    // 3. Fix STITCHING order: Inspection(5) → 6, Stitching(6) → 5
    const fixInspection = await prisma.$executeRaw`
      UPDATE "Process" SET "order" = 6
      WHERE name = 'Inspection' AND "order" = 5
        AND "itemId" IN (SELECT id FROM "Item" WHERE type = 'STITCHING')
    `;
    const fixStitching = await prisma.$executeRaw`
      UPDATE "Process" SET "order" = 5
      WHERE name = 'Stitching' AND "order" = 6
        AND "itemId" IN (SELECT id FROM "Item" WHERE type = 'STITCHING')
    `;
    results.push(`✅ Fixed STITCHING order: ${fixInspection} Inspection + ${fixStitching} Stitching record(s) updated`);
  } catch (e: any) {
    results.push(`❌ STITCHING order fix failed: ${e.message?.split("\n")[0]}`);
  }

  return { success: true, results };
}

/**
 * One-time seed script for base inventory materials.
 * Safe to re-run — uses upsert by name.
 *
 * Run with:
 *   npx tsx prisma/seed-inventory.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
// Load .env from project root before PrismaClient is created
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";

// Use DIRECT_URL for scripts to bypass connection pooler restrictions
const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL || process.env.DATABASE_URL,
});

const MATERIALS = [
  {
    name: "Paper Stock",
    description: "Raw paper sheets used in the Cutting process",
    unit: "reams",
    currentStock: 100,
    minStock: 10,
  },
  {
    name: "Ink - Black",
    description: "Black ink for single-color printing",
    unit: "cans",
    currentStock: 30,
    minStock: 5,
  },
  {
    name: "Ink - Color",
    description: "Color ink for two-color or full-color printing",
    unit: "cans",
    currentStock: 20,
    minStock: 5,
  },
  {
    name: "Adhesive / Glue",
    description: "Glue used in the Folding process for binding",
    unit: "kg",
    currentStock: 15,
    minStock: 2,
  },
  {
    name: "Stitching Wire",
    description: "Wire used in the Stitching process for saddle-stitched booklets",
    unit: "rolls",
    currentStock: 10,
    minStock: 3,
  },
];

async function main() {
  console.log("🌱 Seeding inventory materials...");

  for (const material of MATERIALS) {
    const existing = await prisma.inventoryItem.findFirst({
      where: { name: material.name },
    });

    if (existing) {
      console.log(`  ⏭  Skipped (already exists): ${material.name}`);
    } else {
      await prisma.inventoryItem.create({ data: material });
      console.log(`  ✅ Created: ${material.name}`);
    }
  }

  console.log("✅ Inventory seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

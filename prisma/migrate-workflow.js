const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

async function main() {
  try {
    // 1. Add REJECTED to ProcessStatus enum
    await prisma.$executeRaw`ALTER TYPE "ProcessStatus" ADD VALUE IF NOT EXISTS 'REJECTED'`;
    console.log('✅ REJECTED added to ProcessStatus enum');

    // 2. Rename "Pre Fold" → "Pre-Fold/Inspection" in existing process records
    const renamed = await prisma.$executeRaw`UPDATE "Process" SET name = 'Pre-Fold/Inspection' WHERE name = 'Pre Fold'`;
    console.log(`✅ Renamed ${renamed} process records from "Pre Fold" to "Pre-Fold/Inspection"`);

    // 3. Fix STITCHING order: swap Inspection(5) and Stitching(6) for STITCHING items
    const fixInspection = await prisma.$executeRaw`
      UPDATE "Process" p SET "order" = 6
      WHERE p.name = 'Inspection' AND p."order" = 5
        AND p."itemId" IN (SELECT id FROM "Item" WHERE type = 'STITCHING')
    `;
    const fixStitching = await prisma.$executeRaw`
      UPDATE "Process" p SET "order" = 5
      WHERE p.name = 'Stitching' AND p."order" = 6
        AND p."itemId" IN (SELECT id FROM "Item" WHERE type = 'STITCHING')
    `;
    console.log(`✅ Fixed STITCHING order: ${fixInspection} Inspection + ${fixStitching} Stitching records updated`);

    console.log('\n✅ Migration complete!');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => {
  console.error('❌ Migration failed:', e.message);
  process.exit(1);
});

/**
 * Utility script to recalculate compliance scores for old scans
 * Run this ONCE to backfill scores for scans created before the scoreA/scoreAA/scoreAAA columns were added
 * 
 * Usage:
 *   cd apps/scanner
 *   npx tsx recalculate-old-scan-scores.ts
 */

import 'dotenv/config';
import { getPrismaClient } from './src/db/client.js';
import { calculateComplianceScores } from './src/utils/compliance-scoring.js';

async function recalculateOldScanScores() {
  console.log('[MIGRATION] Starting compliance score recalculation for old scans...\n');

  const prisma = await getPrismaClient();
  if (!prisma) {
    console.error('❌ Failed to initialize Prisma client');
    process.exit(1);
  }

  try {
    // Find scans with NULL scores
    const scansToUpdate = await prisma.scan.findMany({
      where: {
        OR: [
          { scoreA: null },
          { scoreAA: null },
        ],
        status: 'completed', // Only process completed scans
      },
      select: {
        id: true,
        scanId: true,
        seedUrl: true,
        completedAt: true,
      },
    });

    console.log(`📊 Found ${scansToUpdate.length} scans with missing compliance scores\n`);

    if (scansToUpdate.length === 0) {
      console.log('✅ All scans already have compliance scores!');
      return;
    }

    let updatedCount = 0;
    let errorCount = 0;

    for (const scan of scansToUpdate) {
      try {
        // Fetch findings for this scan
        const findings = await prisma.finding.findMany({
          where: { scanId: scan.id },
          select: {
            level: true,
            status: true,
          },
        });

        if (findings.length === 0) {
          console.log(`⚠️  Scan ${scan.scanId}: No findings, skipping`);
          continue;
        }

        // Calculate compliance scores
        const scores = calculateComplianceScores(findings as any);

        // Update scan with new scores
        await prisma.scan.update({
          where: { id: scan.id },
          data: {
            scoreA: scores.scoreA,
            scoreAA: scores.scoreAA,
            scoreAAA: scores.scoreAAA,
            needsReviewRate: scores.needsReviewRate,
          },
        });

        updatedCount++;
        console.log(
          `✅ Scan ${scan.scanId}: ` +
          `A: ${scores.scoreA?.toFixed(1) || 'N/A'}%, ` +
          `AA: ${scores.scoreAA?.toFixed(1) || 'N/A'}%`
        );
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to update scan ${scan.scanId}:`, error);
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Updated: ${updatedCount} scans`);
    console.log(`   ❌ Errors: ${errorCount} scans`);
    console.log(`\n✅ Migration complete!`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
recalculateOldScanScores().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

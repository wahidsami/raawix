// Quick script to check vision findings for a specific scan
// Usage: pnpm --filter scanner exec tsx check-vision-findings.js scan_1767992232929_0gw944y

// Load environment variables first
import 'dotenv/config';

import { getPrismaClient } from './src/db/client.js';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { config } from './src/config.js';

const scanId = process.argv[2] || 'scan_1767992232929_0gw944y';

async function checkVisionFindings() {
  const prisma = await getPrismaClient();
  if (!prisma) {
    console.error('❌ Database not available');
    process.exit(1);
  }

  try {
    console.log(`\n🔍 Checking Vision Findings for: ${scanId}\n`);

    // 1. Check if scan exists
    const scan = await prisma.scan.findUnique({
      where: { scanId },
      include: {
        pages: {
          include: {
            visionFindings: {
              select: {
                id: true,
                kind: true,
                confidence: true,
                detectedText: true,
                correlatedSelector: true,
                createdAt: true,
              },
              orderBy: { confidence: 'desc' },
            },
          },
          orderBy: { pageNumber: 'asc' },
        },
        _count: {
          select: {
            visionFindings: true,
          },
        },
      },
    });

    if (!scan) {
      console.log('❌ Scan not found in database');
      return;
    }

    console.log(`✅ Scan found:`);
    console.log(`   Status: ${scan.status}`);
    console.log(`   Started: ${scan.startedAt}`);
    console.log(`   Completed: ${scan.completedAt || 'N/A'}`);
    console.log(`   Total Pages: ${scan.pages.length}`);
    console.log(`   Total Vision Findings (DB): ${scan._count.visionFindings}\n`);

    // 2. Check vision findings by page
    console.log('📄 Vision Findings by Page:\n');
    let totalFindings = 0;
    let pagesWithFindings = 0;

    for (const page of scan.pages) {
      const findingsCount = page.visionFindings.length;
      totalFindings += findingsCount;
      
      if (findingsCount > 0) {
        pagesWithFindings++;
        console.log(`   Page ${page.pageNumber}: ${page.url}`);
        console.log(`      Vision Findings: ${findingsCount}`);
        page.visionFindings.forEach((vf) => {
          console.log(`        - ${vf.kind} (${vf.confidence})`);
          if (vf.detectedText) {
            console.log(`          Text: "${vf.detectedText}"`);
          }
          if (vf.correlatedSelector) {
            console.log(`          Selector: ${vf.correlatedSelector}`);
          }
        });
        console.log('');
      } else {
        console.log(`   Page ${page.pageNumber}: ${page.url} - 0 findings`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Pages with vision findings: ${pagesWithFindings}/${scan.pages.length}`);
    console.log(`   Total vision findings: ${totalFindings}`);
    console.log(`   Database count: ${scan._count.visionFindings}\n`);

    // 3. Check vision files on disk
    console.log('💾 Checking Vision Files on Disk:\n');
    const outputDir = resolve(config.outputDir);
    const scanDir = join(outputDir, scanId);
    const pagesDir = join(scanDir, 'pages');

    if (!existsSync(pagesDir)) {
      console.log(`   ⚠️  Pages directory not found: ${pagesDir}`);
    } else {
      let pagesWithVisionFiles = 0;
      const { readdir } = await import('node:fs/promises');
      
      for (const page of scan.pages) {
        const pageDir = join(pagesDir, String(page.pageNumber));
        const visionFile = join(pageDir, 'vision.json');
        const visionDir = join(pageDir, 'vision');
        
        const hasVisionFile = existsSync(visionFile);
        const hasVisionDir = existsSync(visionDir);
        
        if (hasVisionFile || hasVisionDir) {
          pagesWithVisionFiles++;
          console.log(`   Page ${page.pageNumber}:`);
          if (hasVisionFile) {
            console.log(`      ✅ vision.json exists`);
            try {
              const content = await readFile(visionFile, 'utf-8');
              const findings = JSON.parse(content);
              console.log(`      📊 ${findings.length} findings in file`);
              if (findings.length > 0) {
                console.log(`      🔍 Sample finding: ${findings[0].kind} (${findings[0].confidence})`);
              }
            } catch (e) {
              console.log(`      ⚠️  Error reading file: ${e.message}`);
            }
          }
          if (hasVisionDir) {
            console.log(`      ✅ vision/ directory exists`);
            try {
              const files = await readdir(visionDir);
              console.log(`      📁 Files in vision/: ${files.length}`);
              if (files.length > 0) {
                console.log(`      📄 Sample files: ${files.slice(0, 3).join(', ')}`);
              }
            } catch (e) {
              console.log(`      ⚠️  Error reading directory: ${e.message}`);
            }
          }
        }
      }
      console.log(`\n   Pages with vision files: ${pagesWithVisionFiles}/${scan.pages.length}`);
    }

    // 4. Check if vision was enabled
    console.log(`\n⚙️  Vision Configuration:`);
    console.log(`   Vision Enabled: ${config.vision.enabled}`);
    console.log(`   OCR Enabled: ${config.vision.ocrEnabled}\n`);

    // 5. Conclusion
    if (totalFindings === 0 && scan._count.visionFindings === 0) {
      console.log('❌ No vision findings found in database or on disk');
      console.log('\nPossible reasons:');
      console.log('   1. Vision analysis was disabled during scan');
      console.log('   2. No unlabeled buttons/links were detected (good!)');
      console.log('   3. Vision analysis failed silently');
      console.log('   4. Vision findings were not saved to database\n');
    } else if (totalFindings > 0 && scan._count.visionFindings === 0) {
      console.log('⚠️  Vision findings exist but not in database!');
      console.log('   This suggests a database persistence issue.\n');
    } else {
      console.log('✅ Vision findings are present!\n');
    }

  } catch (error) {
    console.error('❌ Error checking vision findings:', error);
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkVisionFindings();


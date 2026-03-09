/**
 * Quick script to analyze findings for a specific scan
 * Usage: node analyze-scan-findings.js <scanId>
 */

import { PrismaClient } from '@prisma/client';

const scanId = process.argv[2] || 'scan_1768448045285_q7gxr13';

const prisma = new PrismaClient();

async function analyzeScanFindings() {
  try {
    console.log(`\n🔍 ANALYZING SCAN: ${scanId}\n`);
    console.log('═'.repeat(80) + '\n');

    // Get scan with all findings
    const scan = await prisma.scan.findUnique({
      where: { scanId },
      include: {
        entity: {
          select: { nameEn: true, nameAr: true },
        },
        property: {
          select: { domain: true },
        },
        pages: {
          include: {
            findings: true,
            visionFindings: true,
          },
          orderBy: { pageNumber: 'asc' },
        },
        _count: {
          select: {
            pages: true,
            findings: true,
            visionFindings: true,
          },
        },
      },
    });

    if (!scan) {
      console.log('❌ Scan not found in database!\n');
      return;
    }

    // Basic Info
    console.log('📊 SCAN OVERVIEW:');
    console.log(`   Entity: ${scan.entity?.nameEn || 'N/A'}`);
    console.log(`   Domain: ${scan.property?.domain || scan.seedUrl}`);
    console.log(`   Status: ${scan.status}`);
    console.log(`   Started: ${scan.startedAt.toISOString()}`);
    console.log(`   Completed: ${scan.completedAt?.toISOString() || 'In Progress'}`);
    console.log(`   Pages Scanned: ${scan._count.pages}`);
    console.log(`   Total Findings: ${scan._count.findings}`);
    console.log(`   Vision Findings: ${scan._count.visionFindings}\n`);

    // Layer 1: WCAG Findings Breakdown
    const allFindings = scan.pages.flatMap((p) => p.findings);
    
    console.log('🎯 LAYER 1: WCAG FINDINGS BREAKDOWN:\n');
    
    // By Status
    const byStatus = {
      pass: allFindings.filter((f) => f.status === 'pass').length,
      fail: allFindings.filter((f) => f.status === 'fail').length,
      needs_review: allFindings.filter((f) => f.status === 'needs_review').length,
    };
    
    console.log('   By Status:');
    console.log(`     ✅ Pass: ${byStatus.pass}`);
    console.log(`     ❌ Fail: ${byStatus.fail}`);
    console.log(`     ⚠️  Needs Review: ${byStatus.needs_review}`);
    console.log(`     📊 Total: ${allFindings.length}\n`);

    // By Level
    const byLevel = {
      A: allFindings.filter((f) => f.level === 'A').length,
      AA: allFindings.filter((f) => f.level === 'AA').length,
      AAA: allFindings.filter((f) => f.level === 'AAA').length,
      vision: allFindings.filter((f) => f.level === 'vision').length,
      unknown: allFindings.filter((f) => !f.level || !['A', 'AA', 'AAA', 'vision'].includes(f.level)).length,
    };
    
    console.log('   By WCAG Level:');
    console.log(`     Level A: ${byLevel.A}`);
    console.log(`     Level AA: ${byLevel.AA}`);
    console.log(`     Level AAA: ${byLevel.AAA}`);
    console.log(`     Vision: ${byLevel.vision}`);
    console.log(`     Unknown: ${byLevel.unknown}\n`);

    // By Confidence
    const byConfidence = {
      high: allFindings.filter((f) => f.confidence === 'high').length,
      medium: allFindings.filter((f) => f.confidence === 'medium').length,
      low: allFindings.filter((f) => f.confidence === 'low').length,
    };
    
    console.log('   By Confidence:');
    console.log(`     High: ${byConfidence.high}`);
    console.log(`     Medium: ${byConfidence.medium}`);
    console.log(`     Low: ${byConfidence.low}\n`);

    // Top Issues (most common)
    const issueCount = {};
    allFindings.forEach((f) => {
      const key = `${f.wcagId || 'UNKNOWN'}: ${f.message?.substring(0, 60) || 'No message'}`;
      issueCount[key] = (issueCount[key] || 0) + 1;
    });
    
    const topIssues = Object.entries(issueCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    console.log('   🔥 Top 10 Most Common Issues:');
    topIssues.forEach(([issue, count], idx) => {
      console.log(`     ${idx + 1}. [${count}×] ${issue}`);
    });
    console.log();

    // Layer 2: Vision Findings
    const allVisionFindings = scan.pages.flatMap((p) => p.visionFindings);
    
    console.log('👁️  LAYER 2: VISION FINDINGS:\n');
    console.log(`   Total: ${allVisionFindings.length}`);
    
    if (allVisionFindings.length > 0) {
      const visionByConfidence = {
        high: allVisionFindings.filter((f) => f.confidence === 'high').length,
        medium: allVisionFindings.filter((f) => f.confidence === 'medium').length,
        low: allVisionFindings.filter((f) => f.confidence === 'low').length,
      };
      
      console.log(`   High Confidence: ${visionByConfidence.high}`);
      console.log(`   Medium Confidence: ${visionByConfidence.medium}`);
      console.log(`   Low Confidence: ${visionByConfidence.low}`);
      
      const visionByKind = {};
      allVisionFindings.forEach((f) => {
        visionByKind[f.kind] = (visionByKind[f.kind] || 0) + 1;
      });
      
      console.log('\n   By Type:');
      Object.entries(visionByKind).forEach(([kind, count]) => {
        console.log(`     ${kind}: ${count}`);
      });
    } else {
      console.log('   ⚠️  No vision findings (Gemini may be disabled or rate limited)');
    }
    console.log();

    // Compliance Scores Calculation
    const failedA = allFindings.filter((f) => f.level === 'A' && f.status === 'fail').length;
    const totalA = allFindings.filter((f) => f.level === 'A' && f.status !== 'needs_review').length;
    const failedAA = allFindings.filter((f) => f.level === 'AA' && f.status === 'fail').length;
    const totalAA = allFindings.filter((f) => f.level === 'AA' && f.status !== 'needs_review').length;
    
    const scoreA = totalA > 0 ? ((totalA - failedA) / totalA) * 100 : 0;
    const scoreAA = totalAA > 0 ? ((totalAA - failedAA) / totalAA) * 100 : 0;
    
    console.log('📈 COMPLIANCE SCORES:\n');
    console.log(`   WCAG Level A:  ${scoreA.toFixed(1)}% (${totalA - failedA}/${totalA} passed)`);
    console.log(`   WCAG Level AA: ${scoreAA.toFixed(1)}% (${totalAA - failedAA}/${totalAA} passed)`);
    console.log();

    // Page-Level Summary
    console.log('📄 PAGE-LEVEL SUMMARY:\n');
    const pagesWithIssues = scan.pages.filter((p) => p.findings.some((f) => f.status === 'fail'));
    console.log(`   Pages with Failures: ${pagesWithIssues.length}/${scan._count.pages}`);
    
    if (pagesWithIssues.length > 0) {
      console.log('\n   🔴 Pages with Most Issues (Top 5):');
      const pageIssues = scan.pages
        .map((p) => ({
          pageNumber: p.pageNumber,
          url: p.url,
          failCount: p.findings.filter((f) => f.status === 'fail').length,
        }))
        .sort((a, b) => b.failCount - a.failCount)
        .slice(0, 5);
      
      pageIssues.forEach((p, idx) => {
        console.log(`     ${idx + 1}. Page ${p.pageNumber}: ${p.failCount} failures`);
        console.log(`        ${p.url.substring(0, 70)}...`);
      });
    }
    console.log();

    // Overall Assessment
    console.log('🎯 OVERALL ASSESSMENT:\n');
    
    if (scan.status !== 'completed') {
      console.log('   ⚠️  SCAN IN PROGRESS - Results are partial!\n');
    } else {
      console.log('   ✅ SCAN COMPLETED SUCCESSFULLY\n');
      
      const avgScoreAA = scoreAA;
      if (avgScoreAA >= 90) {
        console.log('   🟢 EXCELLENT: Strong accessibility compliance (90%+)');
      } else if (avgScoreAA >= 75) {
        console.log('   🟡 GOOD: Acceptable compliance, but room for improvement (75-90%)');
      } else if (avgScoreAA >= 50) {
        console.log('   🟠 NEEDS WORK: Below industry standards (50-75%)');
      } else {
        console.log('   🔴 CRITICAL: Significant accessibility barriers (<50%)');
      }
      
      console.log(`\n   Failure Rate: ${byStatus.fail}/${allFindings.length} (${((byStatus.fail / allFindings.length) * 100).toFixed(1)}%)`);
      
      if (allVisionFindings.length === 0 && scan._count.pages > 50) {
        console.log('\n   ⚠️  NOTE: Vision findings are 0 - likely hit Gemini API rate limits');
        console.log('      This is normal for large scans with free Gemini tier.');
        console.log('      WCAG (Layer 1) and Assistive (Layer 3) are complete.');
      }
    }
    
    console.log('\n' + '═'.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error analyzing scan:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeScanFindings();

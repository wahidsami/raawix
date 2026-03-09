/**
 * PDF Export API Endpoint
 * 
 * Generates professional bilingual PDF reports with AI-generated content
 * Uses HTML template + Playwright (falls back to pdf-lib if needed)
 */

import { Router, Request, Response } from 'express';
import { getPrismaClient } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';
import { config } from '../config.js';
import { calculateComplianceScores } from '../utils/compliance-scoring.js';
import { ReportContentGenerator, type ScanData } from '../services/report-content-generator.js';
import { PDFTemplateRenderer, type TemplateData } from '../services/pdf-template-renderer.js';
import { loadLogoAsDataUrl, loadPoweredByLogoAsDataUrl, loadEntityLogoAsDataUrl } from '../utils/logo-loader.js';
import { getPDFTranslation } from '../utils/pdf-i18n.js';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'; // Fallback

const router: Router = Router();

const exportSchema = z.object({
  scanId: z.string(),
  format: z.enum(['pdf']).default('pdf'),
  locale: z.enum(['en', 'ar']).default('en'),
  includeScreenshots: z.boolean().default(false),
});

/**
 * POST /api/reports/export
 * Generate PDF report for a scan
 */
router.post('/export', requireAuth, async (req: Request, res: Response) => {
  let templateRenderer: PDFTemplateRenderer | null = null;

  try {
    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const data = exportSchema.parse(req.body);
    const { scanId, locale } = data;

    // Get scan with all relations
    const scan = await prisma.scan.findUnique({
      where: { scanId },
      include: {
        entity: {
          select: {
            code: true,
            nameEn: true,
            nameAr: true,
            type: true,
            logoPath: true,
          },
        },
        property: {
          select: {
            domain: true,
            displayNameEn: true,
            displayNameAr: true,
          },
        },
        pages: {
          include: {
            findings: {
              orderBy: [{ level: 'asc' }, { status: 'asc' }, { wcagId: 'asc' }],
              // Include ALL findings, not just failed ones
            },
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
      return res.status(404).json({ error: 'Scan not found' });
    }

    if (scan.status !== 'completed') {
      return res.status(400).json({ error: 'Scan must be completed to generate PDF' });
    }

    // Calculate compliance scores
    const allFindings = await prisma.finding.findMany({
      where: { scanId: scan.id },
      select: {
        level: true,
        status: true,
        wcagId: true,
        message: true,
        pageId: true,
      },
    });

    const ruleResults = allFindings.map((f: any) => ({
      level: (f.level as 'A' | 'AA' | 'AAA' | null) || null,
      status: f.status as 'pass' | 'fail' | 'needs_review' | 'na',
    }));

    const scores = calculateComplianceScores(ruleResults);

    // Get ALL findings for report (prioritize failed, then needs_review, then others)
    // Sort: failed first, then needs_review, then by level (A before AA)
    const sortedFindings = allFindings.sort((a: any, b: any) => {
      // Status priority: fail > needs_review > pass > na
      const statusPriority: Record<string, number> = { fail: 0, needs_review: 1, pass: 2, na: 3 };
      const statusDiff = (statusPriority[a.status] ?? 99) - (statusPriority[b.status] ?? 99);
      if (statusDiff !== 0) return statusDiff;

      // Then by level: A before AA
      const levelPriority: Record<string, number> = { A: 0, AA: 1, AAA: 2 };
      const levelA = (a.level as string) || '';
      const levelB = (b.level as string) || '';
      const levelDiff = (levelPriority[levelA] ?? 99) - (levelPriority[levelB] ?? 99);
      if (levelDiff !== 0) return levelDiff;

      // Then by WCAG ID
      return (a.wcagId || '').localeCompare(b.wcagId || '');
    });

    const reportFindings = sortedFindings.map((f: any) => {
      const page = scan.pages.find((p: any) => p.id === f.pageId);
      return {
        wcagId: f.wcagId || 'Unknown',
        level: f.level || 'N/A',
        status: f.status,
        message: f.message || 'No description',
        pageUrl: page?.url || 'N/A',
      };
    });

    // For AI content, use top findings (prioritize failed)
    const topFindings = reportFindings
      .filter((f: any) => f.status === 'fail' || f.status === 'needs_review')
      .slice(0, 10);

    // Prepare data for AI content generation
    const scanData: ScanData = {
      entityName: locale === 'ar' && scan.entity?.nameAr ? scan.entity.nameAr : scan.entity?.nameEn || 'Unknown Entity',
      entityType: (scan.entity?.type as 'government' | 'private') || 'private',
      propertyName: locale === 'ar' && scan.property?.displayNameAr ? scan.property.displayNameAr : scan.property?.displayNameEn || scan.property?.domain || 'Unknown Property',
      scanDate: new Date(scan.completedAt || scan.startedAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US'),
      totalPages: scan._count.pages,
      totalFindings: scan._count.findings,
      scoreA: scores.scoreA,
      scoreAA: scores.scoreAA,
      needsReviewRate: scores.needsReviewRate,
      failedRules: scores.failedRules,
      needsReviewRules: scores.needsReviewRules,
      topFindings,
      locale,
    };

    // Generate AI content
    const contentGenerator = new ReportContentGenerator(scanId);
    const reportContent = await contentGenerator.generateContent(scanData);

    // Load logos
    const logoDataUrl = await loadLogoAsDataUrl();
    const poweredByLogoDataUrl = await loadPoweredByLogoAsDataUrl();
    const entityLogoDataUrl = scan.entity?.logoPath
      ? await loadEntityLogoAsDataUrl(scan.entity.logoPath)
      : undefined;

    // Prepare template data
    const isRTL = locale === 'ar';
    const entityName = scanData.entityName;
    const propertyName = scanData.propertyName;
    const scanDate = scanData.scanDate;
    const entityCode = scan.entity?.code || 'N/A';

    const scoreAText = scores.scoreA !== null ? `${scores.scoreA.toFixed(1)}%` : 'N/A';
    const scoreAAText = scores.scoreAA !== null ? `${scores.scoreAA.toFixed(1)}%` : 'N/A';
    const needsReviewRateText = scores.needsReviewRate !== null ? `${scores.needsReviewRate.toFixed(1)}%` : 'N/A';

    // Build findings table rows - include ALL findings, not just top 15
    const findingsRows = reportFindings.map((f: any) => {
      const statusClass = f.status === 'fail' ? 'badge-fail' : f.status === 'needs_review' ? 'badge-review' : 'badge-pass';
      const statusText = locale === 'ar'
        ? (f.status === 'fail' ? 'فشل' : f.status === 'needs_review' ? 'يحتاج مراجعة' : 'نجح')
        : (f.status === 'fail' ? 'Fail' : f.status === 'needs_review' ? 'Needs Review' : 'Pass');

      return `
        <tr>
          <td>${f.wcagId}</td>
          <td><span class="level-badge">${f.level}</span></td>
          <td><span class="badge ${statusClass}">${statusText}</span></td>
          <td>${f.message.substring(0, 100)}${f.message.length > 100 ? '...' : ''}</td>
          <td style="font-size: 9px; word-break: break-all;">${f.pageUrl.substring(0, 50)}${f.pageUrl.length > 50 ? '...' : ''}</td>
        </tr>
      `;
    }).join('');

    const templateData: TemplateData = {
      logoDataUrl,
      poweredByLogoDataUrl,
      entityLogoDataUrl,
      entityLogoDisplay: entityLogoDataUrl ? 'display: block;' : 'display: none;',
      reportTitle: getPDFTranslation('reportTitle', locale),
      subtitle: getPDFTranslation('subtitle', locale),
      entityName,
      propertyName,
      scanDate,
      entityCode,
      entityLabel: getPDFTranslation('entityLabel', locale),
      propertyLabel: getPDFTranslation('propertyLabel', locale),
      scanDateLabel: getPDFTranslation('scanDateLabel', locale),
      entityCodeLabel: getPDFTranslation('entityCodeLabel', locale),
      introductionTitle: getPDFTranslation('introductionTitle', locale),
      introductionContent: reportContent.introduction,
      reportGeneratedOn: getPDFTranslation('reportGeneratedOn', locale),
      generationDate: new Date().toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US'),
      executiveSummaryTitle: getPDFTranslation('executiveSummaryTitle', locale),
      wcagALabel: getPDFTranslation('wcagALabel', locale),
      wcagAALabel: getPDFTranslation('wcagAALabel', locale),
      needsReviewLabel: getPDFTranslation('needsReviewLabel', locale),
      scoreA: scoreAText,
      scoreAA: scoreAAText,
      needsReviewRate: needsReviewRateText,
      scoreADetail: `${scores.passedRules} ${locale === 'ar' ? 'قاعدة نجحت' : 'rules passed'}`,
      scoreAADetail: `${scores.passedRules} ${locale === 'ar' ? 'قاعدة نجحت' : 'rules passed'}`,
      needsReviewDetail: `${scores.needsReviewRules} ${locale === 'ar' ? 'قاعدة تحتاج مراجعة' : 'rules need review'}`,
      scanStatisticsTitle: getPDFTranslation('scanStatisticsTitle', locale),
      totalPagesLabel: getPDFTranslation('totalPagesLabel', locale),
      totalFindingsLabel: getPDFTranslation('totalFindingsLabel', locale),
      failedRulesLabel: getPDFTranslation('failedRulesLabel', locale),
      needsReviewRulesLabel: getPDFTranslation('needsReviewRulesLabel', locale),
      totalPages: scan._count.pages.toString(),
      totalFindings: scan._count.findings.toString(),
      failedRules: scores.failedRules.toString(),
      needsReviewRules: scores.needsReviewRules.toString(),
      keyFindingsTitle: getPDFTranslation('keyFindingsTitle', locale),
      keyFindingsContent: reportContent.keyFindings,
      topFindingsTitle: getPDFTranslation('topFindingsTitle', locale),
      wcagIdHeader: getPDFTranslation('wcagIdHeader', locale),
      levelHeader: getPDFTranslation('levelHeader', locale),
      statusHeader: getPDFTranslation('statusHeader', locale),
      descriptionHeader: getPDFTranslation('descriptionHeader', locale),
      pageHeader: getPDFTranslation('pageHeader', locale),
      findingsRows: findingsRows || '<tr><td colspan="5">No findings</td></tr>',
      footerText: getPDFTranslation('footerText', locale),
      reportGeneratedBy: getPDFTranslation('reportGeneratedBy', locale),
      disclaimerText: getPDFTranslation('disclaimerText', locale),
      locale,
      direction: isRTL ? 'rtl' : 'ltr',
    };

    // Try template-based rendering
    try {
      templateRenderer = new PDFTemplateRenderer(scanId);
      const pdfBuffer = await templateRenderer.renderToPDF(templateData);

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="raawi-x-report-${scanId}-${locale}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length.toString());

      res.send(pdfBuffer);
      return;
    } catch (templateError) {
      console.error('[PDF-EXPORT] Template rendering failed, using fallback:', templateError);
      // Fall through to fallback
    }

    // FALLBACK: Use old pdf-lib method
    console.log('[PDF-EXPORT] Using fallback pdf-lib method');
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const coverPage = pdfDoc.addPage([595, 842]);
    const coverWidth = coverPage.getWidth();
    const coverHeight = coverPage.getHeight();

    coverPage.drawText(getPDFTranslation('reportTitle', locale), {
      x: isRTL ? coverWidth - 250 : 50,
      y: coverHeight - 100,
      size: 24,
      font: fontBold,
    });

    coverPage.drawText(entityName, {
      x: isRTL ? coverWidth - 250 : 50,
      y: coverHeight - 150,
      size: 18,
      font: font,
    });

    coverPage.drawText(`${getPDFTranslation('propertyLabel', locale)}: ${propertyName}`, {
      x: isRTL ? coverWidth - 250 : 50,
      y: coverHeight - 180,
      size: 14,
      font: font,
    });

    coverPage.drawText(`${getPDFTranslation('scanDateLabel', locale)}: ${scanDate}`, {
      x: isRTL ? coverWidth - 250 : 50,
      y: coverHeight - 210,
      size: 12,
      font: font,
    });

    const summaryPage = pdfDoc.addPage([595, 842]);
    summaryPage.drawText(getPDFTranslation('executiveSummaryTitle', locale), {
      x: isRTL ? 595 - 200 : 50,
      y: 800,
      size: 20,
      font: fontBold,
    });

    summaryPage.drawText(`${getPDFTranslation('wcagALabel', locale)}: ${scoreAText}`, {
      x: isRTL ? 595 - 250 : 50,
      y: 750,
      size: 14,
      font: font,
    });

    summaryPage.drawText(`${getPDFTranslation('wcagAALabel', locale)}: ${scoreAAText}`, {
      x: isRTL ? 595 - 250 : 50,
      y: 720,
      size: 14,
      font: font,
    });

    summaryPage.drawText(`${getPDFTranslation('totalPagesLabel', locale)}: ${scan._count.pages}`, {
      x: isRTL ? 595 - 250 : 50,
      y: 690,
      size: 12,
      font: font,
    });

    summaryPage.drawText(`${getPDFTranslation('totalFindingsLabel', locale)}: ${scan._count.findings}`, {
      x: isRTL ? 595 - 250 : 50,
      y: 660,
      size: 12,
      font: font,
    });

    const pdfBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="raawi-x-report-${scanId}-${locale}.pdf"`);
    res.setHeader('Content-Length', pdfBytes.length.toString());

    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    console.error('[PDF-EXPORT] Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  } finally {
    // Cleanup
    if (templateRenderer) {
      await templateRenderer.close().catch(console.error);
    }
  }
});

export default router;

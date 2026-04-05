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
import {
  escapeHtml,
  formatAgentConfidenceScore,
  agentSourceLabel,
  formatSuggestedWcagIds,
} from '../utils/agent-report-format.js';
import { renderFallbackScanPdf } from '../utils/pdf-lib-fallback-report.js';

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
        agentFindings: {
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            pages: true,
            findings: true,
            visionFindings: true,
            agentFindings: true,
          },
        },
      },
    });

    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    const hasExportableData =
      scan._count.pages > 0 || scan._count.findings > 0 || scan._count.agentFindings > 0;
    /** DB often stays `queued` until saveReportResults; treat as in-flight until we have artifacts. */
    const inFlight = ['queued', 'running', 'discovering'].includes(scan.status);

    if (inFlight && !hasExportableData) {
      return res.status(400).json({
        error: 'Scan is still in progress; wait until it finishes or is stopped to export.',
      });
    }

    const isPartialTerminal = scan.status === 'canceled' || scan.status === 'failed';
    if (isPartialTerminal && !hasExportableData) {
      return res.status(400).json({
        error: 'No scan results available to export. Complete at least one page or save findings first.',
      });
    }

    const isPartialExport =
      (isPartialTerminal && hasExportableData) || (inFlight && hasExportableData);

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

    const pageUrlByPageId = new Map<string, string>();
    for (const p of scan.pages as { id: string; url: string }[]) {
      pageUrlByPageId.set(p.id, p.url);
    }

    const agentList = scan.agentFindings as Array<{
      pageId: string | null;
      kind: string;
      message: string | null;
      confidence: number;
      source: string;
      howToVerify: string | null;
      suggestedWcagIdsJson: unknown;
    }>;

    const parseSuggestedWcag = (raw: unknown): unknown => {
      if (raw == null) return null;
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw);
        } catch {
          return raw;
        }
      }
      return raw;
    };

    const analysisAgentTableOrEmpty =
      !agentList?.length
        ? `<p class="intro-content">${escapeHtml(getPDFTranslation('analysisAgentEmpty', locale))}</p>`
        : `<table class="findings-table"><thead><tr>
          <th>${escapeHtml(getPDFTranslation('analysisAgentKindHeader', locale))}</th>
          <th>${escapeHtml(getPDFTranslation('analysisAgentSourceHeader', locale))}</th>
          <th>${escapeHtml(getPDFTranslation('analysisAgentConfidenceHeader', locale))}</th>
          <th>${escapeHtml(getPDFTranslation('analysisAgentMessageHeader', locale))}</th>
          <th>${escapeHtml(getPDFTranslation('analysisAgentHowToHeader', locale))}</th>
          <th>${escapeHtml(getPDFTranslation('analysisAgentWcagHeader', locale))}</th>
          <th>${escapeHtml(getPDFTranslation('analysisAgentPageHeader', locale))}</th>
        </tr></thead><tbody>
        ${agentList
          .map((af) => {
            const pageUrl = af.pageId ? pageUrlByPageId.get(af.pageId) || '—' : '—';
            const msg = escapeHtml((af.message || '—').slice(0, 220));
            const how = escapeHtml((af.howToVerify || '—').slice(0, 140));
            const wcagRaw = parseSuggestedWcag(af.suggestedWcagIdsJson);
            const wcag = escapeHtml(formatSuggestedWcagIds(wcagRaw).slice(0, 100));
            return `<tr>
            <td>${escapeHtml(af.kind)}</td>
            <td>${escapeHtml(agentSourceLabel(af.source, locale))}</td>
            <td>${escapeHtml(formatAgentConfidenceScore(af.confidence))}</td>
            <td>${msg}</td>
            <td>${how}</td>
            <td>${wcag}</td>
            <td style="font-size:9px;word-break:break-all;">${escapeHtml(pageUrl.slice(0, 100))}</td>
          </tr>`;
          })
          .join('')}
        </tbody></table>`;

    const findingsForFallback = reportFindings.map((f: any) => {
      const statusText =
        locale === 'ar'
          ? f.status === 'fail'
            ? 'فشل'
            : f.status === 'needs_review'
              ? 'يحتاج مراجعة'
              : f.status === 'pass'
                ? 'نجح'
                : 'غير قابل'
          : f.status === 'fail'
            ? 'Fail'
            : f.status === 'needs_review'
              ? 'Needs review'
              : f.status === 'pass'
                ? 'Pass'
                : 'N/A';
      return {
        wcagId: f.wcagId,
        level: f.level,
        statusText,
        message: f.message,
        pageUrl: f.pageUrl,
      };
    });

    const agentRowsForFallback = (agentList || []).map((af) => {
      const pageUrl = af.pageId ? pageUrlByPageId.get(af.pageId) || '—' : '—';
      const wcagRaw = parseSuggestedWcag(af.suggestedWcagIdsJson);
      return {
        kind: af.kind,
        source: agentSourceLabel(af.source, locale),
        confidence: formatAgentConfidenceScore(af.confidence),
        message: af.message || '—',
        howToVerify: af.howToVerify || '—',
        suggestedWcag: formatSuggestedWcagIds(wcagRaw) || '—',
        pageUrl,
      };
    });

    const fallbackSubtitle = isPartialExport
      ? inFlight && hasExportableData && !isPartialTerminal
        ? getPDFTranslation('interimExportSubtitle', locale)
        : getPDFTranslation('partialReportSubtitle', locale)
      : undefined;

    const templateData: TemplateData = {
      logoDataUrl,
      poweredByLogoDataUrl,
      entityLogoDataUrl,
      entityLogoDisplay: entityLogoDataUrl ? 'display: block;' : 'display: none;',
      reportTitle: getPDFTranslation('reportTitle', locale),
      subtitle: isPartialExport
        ? inFlight && hasExportableData && !isPartialTerminal
          ? getPDFTranslation('interimExportSubtitle', locale)
          : getPDFTranslation('partialReportSubtitle', locale)
        : getPDFTranslation('subtitle', locale),
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
      analysisAgentFindingsLabel: getPDFTranslation('analysisAgentFindingsLabel', locale),
      totalAnalysisAgentFindings: String(scan._count.agentFindings),
      analysisAgentTitle: getPDFTranslation('analysisAgentTitle', locale),
      analysisAgentIntro: getPDFTranslation('analysisAgentIntro', locale),
      analysisAgentTableOrEmpty,
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
      console.error(
        '[PDF-EXPORT] Template rendering failed; using embedded-font text fallback PDF:',
        templateError instanceof Error ? templateError.message : templateError
      );
    }

    try {
      const pdfBytes = await renderFallbackScanPdf({
        reportTitle: templateData.reportTitle,
        subtitleLine: fallbackSubtitle,
        entityName: templateData.entityName,
        propertyLabel: templateData.propertyLabel,
        propertyName: templateData.propertyName,
        scanDateLabel: templateData.scanDateLabel,
        scanDate: templateData.scanDate,
        entityCodeLabel: templateData.entityCodeLabel,
        entityCode: templateData.entityCode,
        reportGeneratedOn: templateData.reportGeneratedOn,
        generationDate: templateData.generationDate,
        introductionTitle: templateData.introductionTitle,
        introductionHtml: templateData.introductionContent,
        executiveSummaryTitle: templateData.executiveSummaryTitle,
        wcagALabel: templateData.wcagALabel,
        scoreA: templateData.scoreA,
        wcagAALabel: templateData.wcagAALabel,
        scoreAA: templateData.scoreAA,
        needsReviewLabel: templateData.needsReviewLabel,
        needsReviewRate: templateData.needsReviewRate,
        scanStatisticsTitle: templateData.scanStatisticsTitle,
        totalPagesLabel: templateData.totalPagesLabel,
        totalPages: scan._count.pages,
        totalFindingsLabel: templateData.totalFindingsLabel,
        totalFindings: scan._count.findings,
        failedRulesLabel: templateData.failedRulesLabel,
        failedRules: scores.failedRules,
        needsReviewRulesLabel: templateData.needsReviewRulesLabel,
        needsReviewRules: scores.needsReviewRules,
        analysisAgentFindingsLabel: templateData.analysisAgentFindingsLabel,
        agentFindingsCount: scan._count.agentFindings,
        disclaimerText: templateData.disclaimerText,
        keyFindingsTitle: templateData.keyFindingsTitle,
        keyFindingsHtml: templateData.keyFindingsContent,
        topFindingsTitle: templateData.topFindingsTitle,
        findings: findingsForFallback,
        analysisAgentTitle: templateData.analysisAgentTitle,
        analysisAgentIntro: templateData.analysisAgentIntro,
        analysisAgentEmpty: getPDFTranslation('analysisAgentEmpty', locale),
        agentRows: agentRowsForFallback,
        footerText: templateData.footerText,
        reportGeneratedBy: templateData.reportGeneratedBy,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="raawi-x-report-${scanId}-${locale}.pdf"`);
      res.setHeader('Content-Length', pdfBytes.length.toString());
      res.send(Buffer.from(pdfBytes));
    } catch (fallbackError) {
      console.error('[PDF-EXPORT] Fallback PDF generation failed:', fallbackError);
      throw fallbackError;
    }

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

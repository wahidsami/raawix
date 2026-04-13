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
import {
  formatAnalysisAgentPageStatus,
  loadAnalysisAgentPageSummaries,
} from '../utils/analysis-agent-summary.js';
import { renderFallbackScanPdf } from '../utils/pdf-lib-fallback-report.js';
import type { ManualCheckpointHistoryEntry } from '@raawi-x/core';
import { loadManualCheckpointHistory } from '../utils/manual-checkpoint-history.js';

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

    const isPartialTerminal = scan.status === 'canceled' || scan.status === 'failed' || scan.status === 'paused';
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
    const auditMode = (scan as any).auditMode === 'raawi-agent' ? 'raawi-agent' : 'classic';
    const isRaawiAgentReport = auditMode === 'raawi-agent';
    const auditModeText = getPDFTranslation(auditMode === 'raawi-agent' ? 'auditModeRaawiAgent' : 'auditModeClassic', locale);
    const scanOutputDir = `${config.outputDir}/${scanId}`;
    const manualCheckpointHistory = await loadManualCheckpointHistory(scanOutputDir);

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

    const pagesWithAgentArtifact = (scan.pages as { agentPath?: string | null }[]).filter(
      (p) => !!p.agentPath && String(p.agentPath).trim() !== ''
    ).length;
    const analysisAgentParticipated =
      pagesWithAgentArtifact > 0 || (agentList?.length ?? 0) > 0;

    const analysisAgentTraceSummaries = await loadAnalysisAgentPageSummaries(
      (scan.pages as { pageNumber: number; url: string; agentPath?: string | null; agentFindings?: unknown[] }[]).map(
        (page) => ({
          pageNumber: page.pageNumber,
          pageUrl: page.url,
          agentPath: page.agentPath,
          findingsCount: page.agentFindings?.length ?? 0,
        })
      )
    );

    const analysisAgentTraceRows = analysisAgentTraceSummaries.map((summary) => ({
      pageNumber: summary.pageNumber,
      pageUrl: summary.pageUrl,
      status: summary.status,
      statusLabel:
        locale === 'ar'
          ? summary.status === 'pass'
            ? getPDFTranslation('analysisAgentPassLabel', locale)
            : summary.status === 'fail'
              ? getPDFTranslation('analysisAgentNotPassLabel', locale)
              : getPDFTranslation('analysisAgentNotRunLabel', locale)
          : formatAnalysisAgentPageStatus(summary.status),
      stepCount: summary.stepCount,
      probeAttemptCount: summary.probeAttemptCount,
      probeSuccessCount: summary.probeSuccessCount,
      issueCount: summary.issueCount,
      traceSummary: summary.traceSummary,
    }));

    const analysisAgentTraceSummary = analysisAgentTraceSummaries.reduce(
      (acc, summary) => {
        acc.pagesWithTrace += summary.executed ? 1 : 0;
        acc.passPages += summary.status === 'pass' ? 1 : 0;
        acc.failPages += summary.status === 'fail' ? 1 : 0;
        acc.notRunPages += summary.status === 'not_run' ? 1 : 0;
        acc.totalIssues += summary.issueCount;
        acc.totalSteps += summary.stepCount;
        acc.totalProbeAttempts += summary.probeAttemptCount;
        acc.totalProbeSuccesses += summary.probeSuccessCount;
        return acc;
      },
      {
        pagesWithTrace: 0,
        passPages: 0,
        failPages: 0,
        notRunPages: 0,
        totalIssues: 0,
        totalSteps: 0,
        totalProbeAttempts: 0,
        totalProbeSuccesses: 0,
      }
    );
    const analysisAgentTraceSummaryText =
      analysisAgentTraceSummary.pagesWithTrace > 0
        ? locale === 'ar'
          ? `تم تسجيل تتبّع على ${analysisAgentTraceSummary.pagesWithTrace} صفحة. نجحت ${analysisAgentTraceSummary.passPages} صفحة، ولم تنجح ${analysisAgentTraceSummary.failPages} صفحة، ولم يعمل الوكيل على ${analysisAgentTraceSummary.notRunPages} صفحة.`
          : `Interaction traces recorded on ${analysisAgentTraceSummary.pagesWithTrace} page(s). ${analysisAgentTraceSummary.passPages} pass, ${analysisAgentTraceSummary.failPages} not pass, ${analysisAgentTraceSummary.notRunPages} not run.`
        : '';

    let analysisAgentTableOrEmpty: string;
    let analysisAgentNoRowsPlain: string;
    let analysisAgentTraceTableOrEmpty: string;
    let analysisAgentTraceNoRowsPlain: string;

    if (agentList?.length) {
      analysisAgentNoRowsPlain = '';
      analysisAgentTableOrEmpty = `<table class="findings-table"><thead><tr>
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
      analysisAgentTraceNoRowsPlain = '';
      analysisAgentTraceTableOrEmpty = `<table class="findings-table"><thead><tr>
          <th>#</th>
          <th>${escapeHtml(getPDFTranslation('analysisAgentPageHeader', locale))}</th>
          <th>${escapeHtml(getPDFTranslation('analysisAgentStatusHeader', locale))}</th>
          <th>${escapeHtml(getPDFTranslation('analysisAgentStepsHeader', locale))}</th>
          <th>${escapeHtml(getPDFTranslation('analysisAgentProbesHeader', locale))}</th>
          <th>${escapeHtml(getPDFTranslation('analysisAgentIssuesHeader', locale))}</th>
          <th>${escapeHtml(getPDFTranslation('analysisAgentTraceSummaryHeader', locale))}</th>
        </tr></thead><tbody>
        ${analysisAgentTraceRows
          .map((row) => {
            return `<tr>
            <td>${row.pageNumber}</td>
            <td style="font-size:9px;word-break:break-all;">${escapeHtml(row.pageUrl.slice(0, 100))}</td>
            <td><span class="badge ${row.status === 'fail' ? 'badge-fail' : row.status === 'pass' ? 'badge-pass' : 'badge-not-run'}">${escapeHtml(row.statusLabel)}</span></td>
            <td>${row.stepCount}</td>
            <td>${row.probeAttemptCount} / ${row.probeSuccessCount}</td>
            <td>${row.issueCount}</td>
            <td>${escapeHtml(row.traceSummary)}</td>
          </tr>`;
          })
          .join('')}
        </tbody></table>`;
    } else if (analysisAgentParticipated) {
      const base = getPDFTranslation('analysisAgentRanNoFindings', locale);
      const suffix =
        pagesWithAgentArtifact > 0
          ? locale === 'ar'
            ? ` صفحات تتضمن أثر تفاعل: ${pagesWithAgentArtifact}.`
            : ` Pages with interaction trace: ${pagesWithAgentArtifact}.`
          : '';
      analysisAgentNoRowsPlain = `${base}${suffix}`;
      analysisAgentTableOrEmpty = `<p class="intro-content">${escapeHtml(base)}${escapeHtml(suffix)}</p>`;
      analysisAgentTraceNoRowsPlain = '';
      analysisAgentTraceTableOrEmpty = `<table class="findings-table"><thead><tr>
          <th>#</th>
          <th>${escapeHtml(getPDFTranslation('analysisAgentPageHeader', locale))}</th>
          <th>${escapeHtml(getPDFTranslation('analysisAgentStatusHeader', locale))}</th>
          <th>${escapeHtml(getPDFTranslation('analysisAgentStepsHeader', locale))}</th>
          <th>${escapeHtml(getPDFTranslation('analysisAgentProbesHeader', locale))}</th>
          <th>${escapeHtml(getPDFTranslation('analysisAgentIssuesHeader', locale))}</th>
          <th>${escapeHtml(getPDFTranslation('analysisAgentTraceSummaryHeader', locale))}</th>
        </tr></thead><tbody>
        ${analysisAgentTraceRows
          .map((row) => {
            return `<tr>
            <td>${row.pageNumber}</td>
            <td style="font-size:9px;word-break:break-all;">${escapeHtml(row.pageUrl.slice(0, 100))}</td>
            <td><span class="badge ${row.status === 'fail' ? 'badge-fail' : row.status === 'pass' ? 'badge-pass' : 'badge-not-run'}">${escapeHtml(row.statusLabel)}</span></td>
            <td>${row.stepCount}</td>
            <td>${row.probeAttemptCount} / ${row.probeSuccessCount}</td>
            <td>${row.issueCount}</td>
            <td>${escapeHtml(row.traceSummary)}</td>
          </tr>`;
          })
          .join('')}
        </tbody></table>`;
    } else {
      analysisAgentNoRowsPlain = getPDFTranslation('analysisAgentNotIncluded', locale);
      analysisAgentTableOrEmpty = `<p class="intro-content">${escapeHtml(analysisAgentNoRowsPlain)}</p>`;
      analysisAgentTraceNoRowsPlain = getPDFTranslation('analysisAgentTraceEmpty', locale);
      analysisAgentTraceTableOrEmpty = `<p class="intro-content">${escapeHtml(analysisAgentTraceNoRowsPlain)}</p>`;
    }

    const raawiLabels =
      locale === 'ar'
        ? {
            reportTitle: 'تقرير وكيل راوي لإمكانية الوصول',
            keyFindingsTitle: 'نتائج وكيل راوي والأدلة الداعمة',
            modeOverviewTitle: 'ملخص تقييم وكيل راوي',
            modeOverviewIntro:
              'هذا التقرير يعرض نتيجة وكيل راوي أولاً. نتائج DOM/WCAG والرؤية تبقى كأدلة تقنية داعمة وليست النتيجة الأساسية لهذا الوضع.',
            pagesWithTrace: 'صفحات لها تتبّع',
            passPages: 'نجح',
            failPages: 'لم ينجح',
            notRunPages: 'لم يعمل',
            totalIssues: 'مشكلات راوي',
            technicalSummaryTitle: 'درجات WCAG الداعمة',
            technicalStatsTitle: 'إحصائيات تقنية داعمة',
            technicalFindingsTitle: 'أدلة DOM/WCAG الداعمة',
            technicalFindingsIntro:
              'الجدول التالي يوضح نتائج الطبقة التقنية. تُستخدم هذه النتائج لتفسير تقرير راوي وليست بديلاً عن نتيجة التفاعل.',
            agentTitle: 'نتائج وكيل راوي',
            agentIntro:
              'تتبّع تفاعل كل صفحة ونتائج وكيل راوي. يوضح هذا القسم ما الذي حاول الوكيل تنفيذه وما إذا سجل مشكلات.',
            traceTitle: 'تتبّع راوي لكل صفحة',
            traceIntro: 'صف واحد لكل صفحة يوضح حالة التفاعل وعدد الخطوات والاختبارات والمشكلات.',
            findingsLabel: 'نتائج راوي',
            domFindingsLabel: 'نتائج DOM/WCAG',
            continuationTitle: 'سجل الاستكمال اليدوي',
            continuationIntro:
              'يوضح هذا القسم متى توقّف فحص راوي عند نقطة تحقق يدوية ومتى تم استئناف الفحص بعد إدخال رمز التحقق.',
            continuationTime: 'الوقت',
            continuationEvent: 'الحدث',
            continuationPage: 'الصفحة',
            continuationDetails: 'التفاصيل',
            continuationPaused: 'توقّف بانتظار إدخال يدوي',
            continuationResumed: 'تم الاستئناف',
            continuationResumeFailed: 'تعذّر الاستئناف',
          }
        : {
            reportTitle: 'Raawi Agent Accessibility Report',
            keyFindingsTitle: 'Raawi Results and Supporting Evidence',
            modeOverviewTitle: 'Raawi Assessment Overview',
            modeOverviewIntro:
              'This report presents the Raawi agent result first. DOM/WCAG and vision observations remain supporting technical evidence, not the primary result for this mode.',
            pagesWithTrace: 'Pages with trace',
            passPages: 'Pass',
            failPages: 'Not pass',
            notRunPages: 'Not run',
            totalIssues: 'Raawi issues',
            technicalSummaryTitle: 'Supporting WCAG Compliance Scores',
            technicalStatsTitle: 'Supporting Technical Statistics',
            technicalFindingsTitle: 'Supporting DOM/WCAG Evidence',
            technicalFindingsIntro:
              'The table below shows technical layer findings. These explain what the DOM/WCAG layer observed and support the Raawi report.',
            agentTitle: 'Raawi Agent Results',
            agentIntro:
              'Per-page interaction trace and Raawi findings for this scan. This section shows what the agent attempted and whether it recorded issues.',
            traceTitle: 'Raawi Per-page Trace',
            traceIntro: 'One row per page showing interaction status, steps, probes, and issues.',
            findingsLabel: 'Raawi findings',
            domFindingsLabel: 'DOM/WCAG findings',
            continuationTitle: 'Manual Continuation Timeline',
            continuationIntro:
              'This section records when the Raawi scan paused at a manual verification checkpoint and when it resumed after operator input.',
            continuationTime: 'Time',
            continuationEvent: 'Event',
            continuationPage: 'Page',
            continuationDetails: 'Details',
            continuationPaused: 'Paused for manual checkpoint',
            continuationResumed: 'Resumed after code entry',
            continuationResumeFailed: 'Resume failed',
          };

    const getContinuationEventLabel = (event: ManualCheckpointHistoryEntry['event']) => {
      if (event === 'paused') return raawiLabels.continuationPaused;
      if (event === 'resumed') return raawiLabels.continuationResumed;
      return raawiLabels.continuationResumeFailed;
    };

    const continuationHistorySummaryText =
      manualCheckpointHistory.length > 0
        ? locale === 'ar'
          ? `تم تسجيل ${manualCheckpointHistory.length} حدث(أحداث) استكمال يدوي خلال هذا الفحص.`
          : `${manualCheckpointHistory.length} manual continuation event(s) were recorded during this scan.`
        : '';

    const continuationHistorySectionHtml =
      manualCheckpointHistory.length > 0
        ? `<div class="section">
          <h2 class="section-title">${escapeHtml(raawiLabels.continuationTitle)}</h2>
          <p class="intro-content">${escapeHtml(raawiLabels.continuationIntro)}</p>
          <div class="intro-content" style="margin-bottom: 12px;">${escapeHtml(continuationHistorySummaryText)}</div>
          <table class="findings-table"><thead><tr>
            <th>${escapeHtml(raawiLabels.continuationTime)}</th>
            <th>${escapeHtml(raawiLabels.continuationEvent)}</th>
            <th>${escapeHtml(raawiLabels.continuationPage)}</th>
            <th>${escapeHtml(raawiLabels.continuationDetails)}</th>
          </tr></thead><tbody>
          ${manualCheckpointHistory
            .map((entry) => {
              const detailParts = [
                entry.formPurpose ? `Form: ${entry.formPurpose}` : '',
                entry.otpLikeFields ? `OTP-like fields: ${entry.otpLikeFields}` : '',
                entry.checkpointHeading ? `Heading: ${entry.checkpointHeading}` : '',
                entry.verificationCodeLength ? `Code length: ${entry.verificationCodeLength}` : '',
                entry.message || '',
              ].filter(Boolean);
              return `<tr>
                <td>${escapeHtml(new Date(entry.timestamp).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US'))}</td>
                <td>${escapeHtml(getContinuationEventLabel(entry.event))}</td>
                <td style="font-size:9px;word-break:break-all;">${escapeHtml(entry.pageUrl.slice(0, 100))}</td>
                <td>${escapeHtml(detailParts.join(' | '))}</td>
              </tr>`;
            })
            .join('')}
          </tbody></table>
        </div>`
        : '';

    const modeOverviewHtml = isRaawiAgentReport
      ? `<div class="section">
          <h2 class="section-title">${escapeHtml(raawiLabels.modeOverviewTitle)}</h2>
          <p class="intro-content">${escapeHtml(raawiLabels.modeOverviewIntro)}</p>
          <div class="stats-grid">
            <div class="stat-item"><div class="label">${escapeHtml(raawiLabels.pagesWithTrace)}</div><div class="value">${analysisAgentTraceSummary.pagesWithTrace}</div></div>
            <div class="stat-item"><div class="label">${escapeHtml(raawiLabels.passPages)}</div><div class="value">${analysisAgentTraceSummary.passPages}</div></div>
            <div class="stat-item"><div class="label">${escapeHtml(raawiLabels.failPages)}</div><div class="value">${analysisAgentTraceSummary.failPages}</div></div>
            <div class="stat-item"><div class="label">${escapeHtml(raawiLabels.notRunPages)}</div><div class="value">${analysisAgentTraceSummary.notRunPages}</div></div>
            <div class="stat-item"><div class="label">${escapeHtml(raawiLabels.totalIssues)}</div><div class="value">${analysisAgentTraceSummary.totalIssues}</div></div>
          </div>
        </div>`
      : '';

    const agentSectionHtml = `<div class="section">
      <h2 class="section-title">${escapeHtml(isRaawiAgentReport ? raawiLabels.agentTitle : getPDFTranslation('analysisAgentTitle', locale))}</h2>
      <p class="intro-content" style="margin-bottom: 16px;">${escapeHtml(isRaawiAgentReport ? raawiLabels.agentIntro : getPDFTranslation('analysisAgentIntro', locale))}</p>
      <div class="intro-content" style="margin-bottom: 12px;">${escapeHtml(analysisAgentTraceSummaryText)}</div>
      <h3 class="section-title" style="font-size: 18px; margin-top: 10px;">${escapeHtml(isRaawiAgentReport ? raawiLabels.traceTitle : getPDFTranslation('analysisAgentTraceTitle', locale))}</h3>
      <p class="intro-content" style="margin-bottom: 12px;">${escapeHtml(isRaawiAgentReport ? raawiLabels.traceIntro : getPDFTranslation('analysisAgentTraceIntro', locale))}</p>
      ${analysisAgentTraceTableOrEmpty}
      <div style="height: 16px;"></div>
      ${analysisAgentTableOrEmpty}
    </div>`;

    const wcagFindingsSectionHtml = `<div class="section">
      ${isRaawiAgentReport ? `<p class="intro-content">${escapeHtml(raawiLabels.technicalFindingsIntro)}</p>` : reportContent.keyFindings}
    </div>
    <div class="section">
      <h2 class="section-title">${escapeHtml(isRaawiAgentReport ? raawiLabels.technicalFindingsTitle : getPDFTranslation('topFindingsTitle', locale))}</h2>
      <table class="findings-table">
        <thead>
          <tr>
            <th>${escapeHtml(getPDFTranslation('wcagIdHeader', locale))}</th>
            <th>${escapeHtml(getPDFTranslation('levelHeader', locale))}</th>
            <th>${escapeHtml(getPDFTranslation('statusHeader', locale))}</th>
            <th>${escapeHtml(getPDFTranslation('descriptionHeader', locale))}</th>
            <th>${escapeHtml(getPDFTranslation('pageHeader', locale))}</th>
          </tr>
        </thead>
        <tbody>
          ${findingsRows || '<tr><td colspan="5">No findings</td></tr>'}
        </tbody>
      </table>
    </div>`;

    const findingsBodyHtml = isRaawiAgentReport
      ? `${agentSectionHtml}${continuationHistorySectionHtml}${wcagFindingsSectionHtml}`
      : `${wcagFindingsSectionHtml}${agentSectionHtml}${continuationHistorySectionHtml}`;

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

    const agentTraceRowsForFallback = analysisAgentTraceRows.map((row) => ({
      pageNumber: row.pageNumber,
      pageUrl: row.pageUrl,
      statusLabel: row.statusLabel,
      stepCount: row.stepCount,
      probeAttemptCount: row.probeAttemptCount,
      probeSuccessCount: row.probeSuccessCount,
      issueCount: row.issueCount,
      traceSummary: row.traceSummary,
    }));

    const continuationRowsForFallback = manualCheckpointHistory.map((entry) => ({
      timestamp: new Date(entry.timestamp).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US'),
      eventLabel: getContinuationEventLabel(entry.event),
      pageUrl: entry.pageUrl,
      details: [
        entry.formPurpose ? `Form: ${entry.formPurpose}` : '',
        entry.otpLikeFields ? `OTP-like fields: ${entry.otpLikeFields}` : '',
        entry.checkpointHeading ? `Heading: ${entry.checkpointHeading}` : '',
        entry.verificationCodeLength ? `Code length: ${entry.verificationCodeLength}` : '',
        entry.message || '',
      ]
        .filter(Boolean)
        .join(' | '),
    }));

    const fallbackSubtitle = isPartialExport
      ? inFlight && hasExportableData && !isPartialTerminal
        ? getPDFTranslation('interimExportSubtitle', locale)
        : getPDFTranslation('partialReportSubtitle', locale)
      : undefined;

    const reportTitle = isRaawiAgentReport
      ? raawiLabels.reportTitle
      : getPDFTranslation('reportTitle', locale);
    const analysisAgentTitle = isRaawiAgentReport
      ? raawiLabels.agentTitle
      : getPDFTranslation('analysisAgentTitle', locale);
    const analysisAgentIntro = isRaawiAgentReport
      ? raawiLabels.agentIntro
      : getPDFTranslation('analysisAgentIntro', locale);
    const analysisAgentTraceTitle = isRaawiAgentReport
      ? raawiLabels.traceTitle
      : getPDFTranslation('analysisAgentTraceTitle', locale);
    const analysisAgentTraceIntro = isRaawiAgentReport
      ? raawiLabels.traceIntro
      : getPDFTranslation('analysisAgentTraceIntro', locale);

    const templateData: TemplateData = {
      logoDataUrl,
      poweredByLogoDataUrl,
      entityLogoDataUrl,
      entityLogoDisplay: entityLogoDataUrl ? 'display: block;' : 'display: none;',
      reportTitle,
      subtitle: isPartialExport
        ? inFlight && hasExportableData && !isPartialTerminal
          ? getPDFTranslation('interimExportSubtitle', locale)
          : getPDFTranslation('partialReportSubtitle', locale)
        : getPDFTranslation('subtitle', locale),
      entityName,
      propertyName,
      scanDate,
      entityCode,
      auditModeLabel: getPDFTranslation('auditModeLabel', locale),
      auditModeText,
      entityLabel: getPDFTranslation('entityLabel', locale),
      propertyLabel: getPDFTranslation('propertyLabel', locale),
      scanDateLabel: getPDFTranslation('scanDateLabel', locale),
      entityCodeLabel: getPDFTranslation('entityCodeLabel', locale),
      introductionTitle: getPDFTranslation('introductionTitle', locale),
      introductionContent: reportContent.introduction,
      reportGeneratedOn: getPDFTranslation('reportGeneratedOn', locale),
      generationDate: new Date().toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US'),
      executiveSummaryTitle: isRaawiAgentReport
        ? raawiLabels.technicalSummaryTitle
        : getPDFTranslation('executiveSummaryTitle', locale),
      wcagALabel: getPDFTranslation('wcagALabel', locale),
      wcagAALabel: getPDFTranslation('wcagAALabel', locale),
      needsReviewLabel: getPDFTranslation('needsReviewLabel', locale),
      scoreA: scoreAText,
      scoreAA: scoreAAText,
      needsReviewRate: needsReviewRateText,
      scoreADetail: `${scores.passedRules} ${locale === 'ar' ? 'قاعدة نجحت' : 'rules passed'}`,
      scoreAADetail: `${scores.passedRules} ${locale === 'ar' ? 'قاعدة نجحت' : 'rules passed'}`,
      needsReviewDetail: `${scores.needsReviewRules} ${locale === 'ar' ? 'قاعدة تحتاج مراجعة' : 'rules need review'}`,
      scanStatisticsTitle: isRaawiAgentReport
        ? raawiLabels.technicalStatsTitle
        : getPDFTranslation('scanStatisticsTitle', locale),
      totalPagesLabel: getPDFTranslation('totalPagesLabel', locale),
      totalFindingsLabel: isRaawiAgentReport
        ? raawiLabels.domFindingsLabel
        : getPDFTranslation('totalFindingsLabel', locale),
      failedRulesLabel: getPDFTranslation('failedRulesLabel', locale),
      needsReviewRulesLabel: getPDFTranslation('needsReviewRulesLabel', locale),
      totalPages: scan._count.pages.toString(),
      totalFindings: scan._count.findings.toString(),
      failedRules: scores.failedRules.toString(),
      needsReviewRules: scores.needsReviewRules.toString(),
      keyFindingsTitle: isRaawiAgentReport
        ? raawiLabels.keyFindingsTitle
        : getPDFTranslation('keyFindingsTitle', locale),
      keyFindingsContent: reportContent.keyFindings,
      topFindingsTitle: getPDFTranslation('topFindingsTitle', locale),
      wcagIdHeader: getPDFTranslation('wcagIdHeader', locale),
      levelHeader: getPDFTranslation('levelHeader', locale),
      statusHeader: getPDFTranslation('statusHeader', locale),
      descriptionHeader: getPDFTranslation('descriptionHeader', locale),
      pageHeader: getPDFTranslation('pageHeader', locale),
      findingsRows: findingsRows || '<tr><td colspan="5">No findings</td></tr>',
      analysisAgentFindingsLabel: isRaawiAgentReport
        ? raawiLabels.findingsLabel
        : getPDFTranslation('analysisAgentFindingsLabel', locale),
      totalAnalysisAgentFindings: String(scan._count.agentFindings),
      analysisAgentTitle,
      analysisAgentIntro,
      analysisAgentTraceTitle,
      analysisAgentTraceIntro,
      analysisAgentTraceSummaryText: analysisAgentTraceSummaryText,
      analysisAgentTraceTableOrEmpty,
      analysisAgentTableOrEmpty,
      modeOverviewHtml,
      findingsBodyHtml,
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
        auditModeLabel: templateData.auditModeLabel,
        auditModeText: templateData.auditModeText,
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
        analysisAgentTraceTitle: templateData.analysisAgentTraceTitle,
        analysisAgentTraceSummaryText: templateData.analysisAgentTraceSummaryText,
        analysisAgentTraceEmpty: analysisAgentTraceNoRowsPlain || templateData.analysisAgentTraceSummaryText,
        traceRows: agentTraceRowsForFallback,
        analysisAgentEmpty:
          agentRowsForFallback.length > 0 ? '—' : analysisAgentNoRowsPlain,
        agentRows: agentRowsForFallback,
        manualContinuationTitle: manualCheckpointHistory.length > 0 ? raawiLabels.continuationTitle : '',
        manualContinuationIntro: continuationHistorySummaryText,
        continuationRows: continuationRowsForFallback,
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

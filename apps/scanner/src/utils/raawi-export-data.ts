import {
  compareNormalizedIssues,
  normalizeAgentFinding,
  normalizeRuleFinding,
  normalizeVisionFinding,
  type NormalizedIssue,
  type NormalizableAgentFinding,
  type NormalizableRuleFinding,
  type NormalizableVisionFinding,
} from './normalized-issue.js';
import {
  formatAnalysisAgentPageStatus,
  loadAnalysisAgentPageSummaries,
  type AnalysisAgentPageSummary,
} from './analysis-agent-summary.js';
import { agentSourceLabel, formatAgentConfidenceScore } from './agent-report-format.js';

export interface RaawiExportPage {
  id?: string | null;
  pageNumber: number;
  url: string;
  canonicalUrl?: string | null;
  finalUrl?: string | null;
  title?: string | null;
  agentPath?: string | null;
}

export interface RaawiExportRuleFinding extends NormalizableRuleFinding {
  pageId?: string | null;
}

export interface RaawiExportVisionFinding extends NormalizableVisionFinding {
  pageId?: string | null;
}

export interface RaawiExportAgentFinding extends NormalizableAgentFinding {
  pageId?: string | null;
}

export interface RaawiAuditorFindingRow extends NormalizedIssue {
  resultLabel: string;
}

export interface RaawiTraceRow {
  pageNumber: number;
  pageUrl: string;
  understanding: string;
  journeys: string;
  status: AnalysisAgentPageSummary['status'];
  statusLabel: string;
  stepCount: number;
  probesText: string;
  issueCount: number;
  summary: string;
}

export interface RaawiFindingRow {
  pageNumber: number;
  pageUrl: string;
  kind: string;
  sourceLabel: string;
  confidenceLabel: string;
  message: string;
}

export interface SupportingTechnicalEvidenceRow {
  pageNumber: number;
  wcagId: string;
  status: string;
  message: string;
}

export interface RaawiPagesRow {
  pageNumber: number;
  url: string;
  raawiAgent: string;
  layer1: string;
  layer2: string;
  layer3: string;
  actions: string;
}

export interface RaawiExportData {
  auditorFindings: RaawiAuditorFindingRow[];
  traceRows: RaawiTraceRow[];
  findingRows: RaawiFindingRow[];
  supportingEvidenceRows: SupportingTechnicalEvidenceRow[];
  pagesRows: RaawiPagesRow[];
  stats: {
    totalPages: number;
    domFindings: number;
    visionFindings: number;
    raawiFindings: number;
    pagesWithTrace: number;
    passPages: number;
    failPages: number;
    notRunPages: number;
    totalIssues: number;
  };
}

function groupByPageId<T extends { pageId?: string | null }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    if (!row.pageId) continue;
    const existing = map.get(row.pageId) ?? [];
    existing.push(row);
    map.set(row.pageId, existing);
  }
  return map;
}

function formatStatus(status: string | null | undefined, locale: 'en' | 'ar'): string {
  if (locale === 'ar') {
    if (status === 'pass') return 'نجح';
    if (status === 'fail') return 'فشل';
    if (status === 'needs_review') return 'يحتاج مراجعة';
    if (status === 'na') return 'غير منطبق';
    return '—';
  }
  if (status === 'pass') return 'Pass';
  if (status === 'fail') return 'Fail';
  if (status === 'needs_review') return 'Needs review';
  if (status === 'na') return 'N/A';
  return '—';
}

function formatAuditorResult(result: string, locale: 'en' | 'ar'): string {
  if (locale === 'ar') {
    if (result === 'working') return 'يعمل';
    if (result === 'not_working') return 'لا يعمل';
    if (result === 'needs_review') return 'يحتاج مراجعة';
    if (result === 'not_applicable') return 'غير منطبق';
    if (result === 'manual_checkpoint') return 'نقطة تحقق يدوية';
    return result;
  }
  if (result === 'working') return 'Working';
  if (result === 'not_working') return 'Not working';
  if (result === 'needs_review') return 'Needs review';
  if (result === 'not_applicable') return 'Not applicable';
  if (result === 'manual_checkpoint') return 'Manual checkpoint';
  return result;
}

function formatTaskResult(result: string, locale: 'en' | 'ar'): string {
  if (locale === 'ar') {
    if (result === 'working') return 'يعمل';
    if (result === 'not_working') return 'لا يعمل';
    if (result === 'manual_checkpoint') return 'تحقق يدوي';
    if (result === 'needs_review') return 'يحتاج مراجعة';
    return result;
  }
  if (result === 'working') return 'Working';
  if (result === 'not_working') return 'Not working';
  if (result === 'manual_checkpoint') return 'Manual checkpoint';
  if (result === 'needs_review') return 'Needs review';
  return result;
}

function compact(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function joinParts(parts: Array<string | null | undefined>, separator = ' | '): string {
  return parts.map((part) => compact(part ?? '')).filter(Boolean).join(separator);
}

function formatUnderstanding(summary: AnalysisAgentPageSummary, locale: 'en' | 'ar'): string {
  const profile = summary.pageProfile;
  if (!profile) {
    return locale === 'ar' ? 'لا يوجد ملف فهم محفوظ' : 'No profile';
  }

  const pageType = profile.pageType.replace(/_/g, ' ');
  const base = joinParts([
    pageType,
    profile.mainHeading || (locale === 'ar' ? 'لا يوجد عنوان رئيسي' : 'No primary heading captured'),
    locale === 'ar'
      ? `${profile.counts.forms} نماذج • ${profile.counts.fields} حقول • ${profile.counts.images} صور`
      : `${profile.counts.forms} forms • ${profile.counts.fields} fields • ${profile.counts.images} images`,
    profile.counts.skipLinks > 0
      ? locale === 'ar'
        ? `${profile.counts.skipLinks} روابط تخطي`
        : `${profile.counts.skipLinks} skip link(s)`
      : locale === 'ar'
        ? 'لا يوجد رابط تخطي'
        : 'No skip link captured',
    profile.counts.passwordFields > 0 || profile.counts.otpLikeFields > 0
      ? locale === 'ar'
        ? `${profile.counts.passwordFields} كلمات مرور • ${profile.counts.otpLikeFields} حقول OTP-like`
        : `${profile.counts.passwordFields} password • ${profile.counts.otpLikeFields} OTP-like`
      : '',
    profile.signals.hasAuthenticatedWorkspace || profile.counts.accountControls > 0 || profile.counts.logoutControls > 0
      ? locale === 'ar'
        ? `${profile.counts.accountControls} مؤشرات حساب • ${profile.counts.logoutControls} مؤشرات خروج`
        : `${profile.counts.accountControls} account cues • ${profile.counts.logoutControls} logout cues`
      : '',
  ]);

  return base || (locale === 'ar' ? 'لا يوجد ملف فهم محفوظ' : 'No profile');
}

function formatJourneys(summary: AnalysisAgentPageSummary, locale: 'en' | 'ar'): string {
  if (summary.journeyRuns?.length) {
    return summary.journeyRuns
      .slice(0, 3)
      .map((journey) =>
        joinParts([
          journey.label,
          formatTaskResult(journey.status, locale),
          journey.relatedProbeNames.length > 0 ? journey.relatedProbeNames.join(', ') : '',
        ])
      )
      .join('\n');
  }

  if (summary.taskAssessments?.length) {
    return summary.taskAssessments
      .slice(0, 3)
      .map((task) => joinParts([task.label, formatTaskResult(task.result, locale)]))
      .join('\n');
  }

  if (summary.pageProfile?.taskIntents?.length) {
    return summary.pageProfile.taskIntents
      .slice(0, 3)
      .map((task) => joinParts([task.label, task.category]))
      .join('\n');
  }

  return locale === 'ar' ? 'لا يوجد مسار مهمة' : 'No task intent';
}

function formatTraceSummary(summary: AnalysisAgentPageSummary): string {
  return joinParts([
    summary.traceSummary,
    ...(summary.journeyRuns?.slice(0, 2).map((journey) => `${journey.label}: ${journey.summary}`) ?? []),
    ...(summary.probeMessages?.slice(0, 2) ?? []),
  ]);
}

async function loadAssistiveMapPresence(
  hostname: string | null | undefined,
  pages: RaawiExportPage[],
): Promise<Map<number, boolean>> {
  const result = new Map<number, boolean>();
  if (!hostname) {
    for (const page of pages) result.set(page.pageNumber, false);
    return result;
  }

  try {
    const { AssistiveMapRepository } = await import('../db/assistive-map-repository.js');
    const repo = new AssistiveMapRepository();
    for (const page of pages) {
      const match = await repo.findPageVersionByUrl(hostname, page.url, page.canonicalUrl || page.url);
      result.set(page.pageNumber, !!match);
    }
  } catch {
    for (const page of pages) result.set(page.pageNumber, false);
  }

  return result;
}

export async function buildRaawiExportData(params: {
  locale: 'en' | 'ar';
  hostname?: string | null;
  pages: RaawiExportPage[];
  ruleFindings: RaawiExportRuleFinding[];
  visionFindings: RaawiExportVisionFinding[];
  agentFindings: RaawiExportAgentFinding[];
}): Promise<RaawiExportData> {
  const { locale, hostname, pages, ruleFindings, visionFindings, agentFindings } = params;
  const ruleByPageId = groupByPageId(ruleFindings);
  const visionByPageId = groupByPageId(visionFindings);
  const agentByPageId = groupByPageId(agentFindings);

  const traceSummaries = await loadAnalysisAgentPageSummaries(
    pages.map((page) => ({
      pageNumber: page.pageNumber,
      pageUrl: page.url,
      agentPath: page.agentPath,
      findingsCount: (agentByPageId.get(page.id ?? '') ?? []).length,
    })),
  );
  const traceByPageNumber = new Map(traceSummaries.map((summary) => [summary.pageNumber, summary]));
  const assistiveMapPresence = await loadAssistiveMapPresence(hostname, pages);

  const auditorFindings: NormalizedIssue[] = [];
  for (const page of pages) {
    let sequence = 1;
    const pageRuleFindings = ruleByPageId.get(page.id ?? '') ?? [];
    const pageVisionFindings = visionByPageId.get(page.id ?? '') ?? [];
    const pageAgentFindings = agentByPageId.get(page.id ?? '') ?? [];

    auditorFindings.push(
      ...pageRuleFindings.map((finding) =>
        normalizeRuleFinding(finding, page.url, page.pageNumber, sequence++, 'Raawi agent report'),
      ),
      ...pageVisionFindings.map((finding) =>
        normalizeVisionFinding(finding, page.url, page.pageNumber, sequence++, 'Raawi agent report'),
      ),
      ...pageAgentFindings.map((finding) =>
        normalizeAgentFinding(finding, page.url, page.pageNumber, sequence++, 'Raawi agent'),
      ),
    );
  }
  auditorFindings.sort(compareNormalizedIssues);

  const traceRows: RaawiTraceRow[] = traceSummaries.map((summary) => ({
    pageNumber: summary.pageNumber,
    pageUrl: summary.pageUrl,
    understanding: formatUnderstanding(summary, locale),
    journeys: formatJourneys(summary, locale),
    status: summary.status,
    statusLabel:
      locale === 'ar'
        ? summary.status === 'pass'
          ? 'نجح'
          : summary.status === 'fail'
            ? 'لم ينجح'
            : 'لم يعمل'
        : formatAnalysisAgentPageStatus(summary.status),
    stepCount: summary.stepCount,
    probesText:
      locale === 'ar'
        ? `${summary.probeAttemptCount} محاولة / ${summary.probeSuccessCount} ناجحة`
        : `${summary.probeAttemptCount} attempted / ${summary.probeSuccessCount} passed`,
    issueCount: summary.issueCount,
    summary: formatTraceSummary(summary),
  }));

  const findingRows: RaawiFindingRow[] = pages.flatMap((page) =>
    (agentByPageId.get(page.id ?? '') ?? []).map((finding) => ({
      pageNumber: page.pageNumber,
      pageUrl: page.url,
      kind: finding.kind || '—',
      sourceLabel: agentSourceLabel(finding.source, locale),
      confidenceLabel: formatAgentConfidenceScore(typeof finding.confidence === 'number' ? finding.confidence : Number(finding.confidence ?? NaN)),
      message: joinParts([
        finding.message || '—',
        finding.howToVerify || '',
        Array.isArray(finding.suggestedWcagIds)
          ? finding.suggestedWcagIds.length > 0
            ? `WCAG: ${finding.suggestedWcagIds.join(', ')}`
            : ''
          : '',
      ], '\n'),
    })),
  );

  const supportingEvidenceRows: SupportingTechnicalEvidenceRow[] = pages.flatMap((page) =>
    (ruleByPageId.get(page.id ?? '') ?? []).map((finding) => ({
      pageNumber: page.pageNumber,
      wcagId: finding.wcagId || 'Unknown',
      status: formatStatus(finding.status, locale),
      message: finding.message || '—',
    })),
  );

  const pagesRows: RaawiPagesRow[] = pages.map((page) => {
    const pageRuleFindings = ruleByPageId.get(page.id ?? '') ?? [];
    const pageVisionFindings = visionByPageId.get(page.id ?? '') ?? [];
    const pageAgentFindings = agentByPageId.get(page.id ?? '') ?? [];
    const trace = traceByPageNumber.get(page.pageNumber);
    const passCount = pageRuleFindings.filter((finding) => finding.status === 'pass').length;
    const totalRuleCount = pageRuleFindings.length;
    const highVisionCount = pageVisionFindings.filter((finding) => finding.confidence === 'high').length;

    return {
      pageNumber: page.pageNumber,
      url: page.url,
      raawiAgent: trace
        ? joinParts([
            locale === 'ar'
              ? trace.status === 'pass'
                ? 'نجح'
                : trace.status === 'fail'
                  ? 'لم ينجح'
                  : 'لم يعمل'
              : formatAnalysisAgentPageStatus(trace.status),
            locale === 'ar'
              ? `${pageAgentFindings.length} نتائج`
              : `${pageAgentFindings.length} findings`,
          ])
        : joinParts([
            locale === 'ar' ? 'لا يوجد تتبّع' : 'No trace',
            locale === 'ar'
              ? `${pageAgentFindings.length} نتائج`
              : `${pageAgentFindings.length} findings`,
          ]),
      layer1:
        locale === 'ar'
          ? `${passCount} / ${totalRuleCount}`
          : `${passCount} / ${totalRuleCount}`,
      layer2:
        pageVisionFindings.length > 0
          ? joinParts([
              locale === 'ar'
                ? `${pageVisionFindings.length} نتائج`
                : `${pageVisionFindings.length} findings`,
              highVisionCount > 0
                ? locale === 'ar'
                  ? `${highVisionCount} عالية`
                  : `${highVisionCount} high`
                : '',
            ])
          : locale === 'ar'
            ? '0 نتائج'
            : '0 findings',
      layer3: assistiveMapPresence.get(page.pageNumber)
        ? locale === 'ar'
          ? 'نعم'
          : 'Yes'
        : locale === 'ar'
          ? 'لا'
          : 'No',
      actions: locale === 'ar' ? 'عرض في التطبيق' : 'View in app',
    };
  });

  return {
    auditorFindings: auditorFindings.map((finding) => ({
      ...finding,
      evidence: finding.evidence || finding.selector || finding.howToVerify || '—',
      resultLabel: formatAuditorResult(finding.result, locale),
    })),
    traceRows,
    findingRows,
    supportingEvidenceRows,
    pagesRows,
    stats: {
      totalPages: pages.length,
      domFindings: ruleFindings.length,
      visionFindings: visionFindings.length,
      raawiFindings: agentFindings.length,
      pagesWithTrace: traceSummaries.filter((summary) => summary.executed).length,
      passPages: traceSummaries.filter((summary) => summary.status === 'pass').length,
      failPages: traceSummaries.filter((summary) => summary.status === 'fail').length,
      notRunPages: traceSummaries.filter((summary) => summary.status === 'not_run').length,
      totalIssues: traceSummaries.reduce((sum, summary) => sum + summary.issueCount, 0),
    },
  };
}

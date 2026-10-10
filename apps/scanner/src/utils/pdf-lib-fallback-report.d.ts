/**
 * Full-structure PDF when Playwright/HTML template rendering is unavailable.
 * Embeds Noto Naskh Arabic (OFL) for Unicode labels and finding text.
 */
export declare function stripHtmlToPlainText(html: string): string;
export interface FallbackFindingRow {
    wcagId: string;
    level: string;
    statusText: string;
    message: string;
    pageUrl: string;
}
export interface FallbackAgentRow {
    kind: string;
    source: string;
    confidence: string;
    message: string;
    howToVerify: string;
    suggestedWcag: string;
    pageUrl: string;
}
export interface FallbackAgentTraceRow {
    pageNumber: number;
    pageUrl: string;
    statusLabel: string;
    stepCount: number;
    probeAttemptCount: number;
    probeSuccessCount: number;
    issueCount: number;
    traceSummary: string;
}
export interface FallbackContinuationRow {
    timestamp: string;
    eventLabel: string;
    pageUrl: string;
    details: string;
}
export interface FallbackScanPdfParams {
    logoDataUrl?: string;
    poweredByLogoDataUrl?: string;
    reportTitle: string;
    subtitleLine?: string;
    entityName: string;
    propertyLabel: string;
    propertyName: string;
    scanDateLabel: string;
    scanDate: string;
    entityCodeLabel: string;
    entityCode: string;
    auditModeLabel: string;
    auditModeText: string;
    reportGeneratedOn: string;
    generationDate: string;
    introductionTitle: string;
    introductionHtml: string;
    executiveSummaryTitle: string;
    wcagALabel: string;
    scoreA: string;
    wcagAALabel: string;
    scoreAA: string;
    needsReviewLabel: string;
    needsReviewRate: string;
    scanStatisticsTitle: string;
    totalPagesLabel: string;
    totalPages: number;
    totalFindingsLabel: string;
    totalFindings: number;
    failedRulesLabel: string;
    failedRules: number;
    needsReviewRulesLabel: string;
    needsReviewRules: number;
    analysisAgentFindingsLabel: string;
    agentFindingsCount: number;
    disclaimerText: string;
    keyFindingsTitle: string;
    keyFindingsHtml: string;
    topFindingsTitle: string;
    findings: FallbackFindingRow[];
    analysisAgentTitle: string;
    analysisAgentIntro: string;
    analysisAgentTraceTitle: string;
    analysisAgentTraceSummaryText: string;
    analysisAgentTraceEmpty: string;
    traceRows: FallbackAgentTraceRow[];
    analysisAgentEmpty: string;
    agentRows: FallbackAgentRow[];
    authCoverageTitle?: string;
    authCoverageText?: string;
    manualContinuationTitle?: string;
    manualContinuationIntro?: string;
    continuationRows?: FallbackContinuationRow[];
    footerText: string;
    reportGeneratedBy: string;
}
export declare function renderFallbackScanPdf(params: FallbackScanPdfParams): Promise<Uint8Array>;
//# sourceMappingURL=pdf-lib-fallback-report.d.ts.map
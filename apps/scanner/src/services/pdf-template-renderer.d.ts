/**
 * PDF Template Renderer
 *
 * Renders HTML template to PDF using Playwright
 * Falls back to pdf-lib if Playwright fails
 */
export interface TemplateData {
    logoDataUrl: string;
    entityLogoDataUrl?: string;
    entityLogoDisplay?: string;
    poweredByLogoDataUrl: string;
    reportTitle: string;
    subtitle: string;
    entityName: string;
    propertyName: string;
    scanDate: string;
    entityCode: string;
    auditModeLabel: string;
    auditModeText: string;
    entityLabel: string;
    propertyLabel: string;
    scanDateLabel: string;
    entityCodeLabel: string;
    introductionTitle: string;
    introductionContent: string;
    reportGeneratedOn: string;
    generationDate: string;
    executiveSummaryTitle: string;
    wcagALabel: string;
    wcagAALabel: string;
    needsReviewLabel: string;
    scoreA: string;
    scoreAA: string;
    needsReviewRate: string;
    scoreADetail: string;
    scoreAADetail: string;
    needsReviewDetail: string;
    scanStatisticsTitle: string;
    totalPagesLabel: string;
    totalFindingsLabel: string;
    failedRulesLabel: string;
    needsReviewRulesLabel: string;
    totalPages: string;
    totalFindings: string;
    failedRules: string;
    needsReviewRules: string;
    keyFindingsTitle: string;
    keyFindingsContent: string;
    topFindingsTitle: string;
    wcagIdHeader: string;
    levelHeader: string;
    statusHeader: string;
    descriptionHeader: string;
    pageHeader: string;
    findingsRows: string;
    /** Analysis AI agent (keyboard simulation + optional AI enrichment) */
    analysisAgentFindingsLabel: string;
    totalAnalysisAgentFindings: string;
    analysisAgentTitle: string;
    analysisAgentIntro: string;
    analysisAgentTraceTitle: string;
    analysisAgentTraceIntro: string;
    analysisAgentTraceSummaryText: string;
    analysisAgentTraceTableOrEmpty: string;
    analysisAgentTableOrEmpty: string;
    modeOverviewHtml: string;
    findingsBodyHtml: string;
    footerText: string;
    reportGeneratedBy: string;
    disclaimerText: string;
    locale: 'en' | 'ar';
    direction: 'ltr' | 'rtl';
    landscape: string;
    pageWidth: string;
    pageMinHeight: string;
}
export declare class PDFTemplateRenderer {
    private logger;
    private browser;
    constructor(scanId?: string);
    /**
     * Render HTML template to PDF using Playwright
     */
    renderToPDF(data: TemplateData): Promise<Buffer>;
    /**
     * Render using Playwright (high quality, supports CSS)
     */
    private renderWithPlaywright;
    /**
     * Fallback: Render using pdf-lib (basic, no CSS)
     * This is a minimal fallback - the main endpoint handles full fallback
     */
    private renderWithPdfLib;
    /**
     * Cleanup browser instance
     */
    close(): Promise<void>;
}
//# sourceMappingURL=pdf-template-renderer.d.ts.map
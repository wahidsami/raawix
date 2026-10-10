import ExcelJS from 'exceljs';
/**
 * Excel Report Generator
 * Generates WCAG findings plus a dedicated Analysis AI agent sheet (keyboard + enrichment).
 * Does not include Layer 2 (vision) or Layer 3 (assistive map) tables.
 */
export declare class ExcelReportGenerator {
    /**
     * Generate Excel report for a scan
     */
    generateExcelReport(scanId: string, locale?: 'en' | 'ar'): Promise<ExcelJS.Workbook>;
    /**
     * Add Raawi-first summary sheet for Raawi agent scans.
     */
    private addRaawiSummarySheet;
    private styleWorksheetForLocale;
    private styleTableHeader;
    private addSheetTitle;
    private addEmptyStateRow;
    private styleDataRows;
    private addRaawiAuditorFindingsSheet;
    private addRaawiAgentResultsSheet;
    private addSupportingTechnicalEvidenceSheet;
    private addRaawiPagesSheet;
    /**
     * Add Summary Sheet (Sheet 1)
     */
    private addSummarySheet;
    /**
     * Add WCAG Findings Sheet (Sheet 2)
     */
    private addFindingsSheet;
    /**
     * Analysis AI agent findings (interaction + OpenAI enrichment)
     */
    private addAnalysisAgentSheet;
    /**
     * Add Analysis Trace Sheet
     */
    private addAnalysisTraceSheet;
    private addManualContinuationSheet;
    /**
     * Add info row helper
     */
    private addInfoRow;
    /**
     * Map finding confidence/level to severity
     * Since Finding model doesn't have severity, derive it from confidence and level
     */
    private mapSeverity;
    /**
     * Extract selector from evidenceJson
     */
    private extractSelector;
    /**
     * Translate status
     */
    private translateStatus;
    /**
     * Translate severity
     */
    private translateSeverity;
    private formatAuthCoverage;
    /**
     * Get translations
     */
    private getTranslations;
}
//# sourceMappingURL=excel-report-generator.d.ts.map
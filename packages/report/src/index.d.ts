import type { ScanResult, Finding, ScanSummary } from '@raawi-x/core';
export interface ReportModel {
    scanId: string;
    url: string;
    timestamp: string;
    summary: ScanSummary;
    findings: Finding[];
}
export declare function createReportModel(result: ScanResult): ReportModel;
export declare function generateHTMLReport(report: ReportModel): string;
//# sourceMappingURL=index.d.ts.map
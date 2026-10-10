import { type NormalizedIssue, type NormalizableAgentFinding, type NormalizableRuleFinding, type NormalizableVisionFinding } from './normalized-issue.js';
import { type AnalysisAgentPageSummary } from './analysis-agent-summary.js';
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
export declare function buildRaawiExportData(params: {
    locale: 'en' | 'ar';
    hostname?: string | null;
    pages: RaawiExportPage[];
    ruleFindings: RaawiExportRuleFinding[];
    visionFindings: RaawiExportVisionFinding[];
    agentFindings: RaawiExportAgentFinding[];
}): Promise<RaawiExportData>;
//# sourceMappingURL=raawi-export-data.d.ts.map
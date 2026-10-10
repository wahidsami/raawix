import type { ReportCategory, TaxonomyMatch } from './report-taxonomy.js';
export type NormalizedIssueResult = 'working' | 'not_working' | 'needs_review' | 'not_applicable';
export type NormalizedIssueSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type NormalizedIssueSource = 'dom' | 'vision' | 'raawi-agent' | 'assistive-map' | 'combined';
export interface NormalizedIssue {
    issueCode: string;
    serviceName: string;
    issueTitle: string;
    result: NormalizedIssueResult;
    severity: NormalizedIssueSeverity;
    category: ReportCategory;
    subcategory: string;
    pageUrl: string;
    pageNumber: number;
    source: NormalizedIssueSource;
    sourceLabel: string;
    wcagIds: string[];
    evidence: string;
    selector?: string;
    recommendation?: string;
    howToVerify?: string;
}
export interface NormalizableRuleFinding {
    id?: string;
    ruleId?: string;
    wcagId?: string | null;
    level?: string | null;
    status?: string | null;
    confidence?: string | null;
    message?: string | null;
    evidence?: unknown;
    evidenceJson?: unknown;
    howToVerify?: string | null;
}
export interface NormalizableAgentFinding {
    id?: string;
    kind?: string | null;
    message?: string | null;
    confidence?: string | number | null;
    evidence?: unknown;
    evidenceJson?: unknown;
    howToVerify?: string | null;
    suggestedWcagIds?: unknown;
    suggestedWcagIdsJson?: unknown;
    source?: string | null;
    category?: string | null;
    subcategory?: string | null;
}
export interface NormalizableVisionFinding {
    id?: string;
    kind?: string | null;
    detectedText?: string | null;
    confidence?: string | null;
    correlatedSelector?: string | null;
    evidence?: unknown;
    evidenceJson?: unknown;
    suggestedWcagIds?: unknown;
    suggestedWcagIdsJson?: unknown;
    url?: string | null;
}
export declare function mapWcagIdToTaxonomy(wcagId?: string | null): TaxonomyMatch;
export declare function mapAgentKindToTaxonomy(kind?: string | null): TaxonomyMatch;
export declare function mapVisionKindToTaxonomy(kind?: string | null): TaxonomyMatch;
export declare function createIssueCode(source: NormalizedIssueSource, pageNumber: number, sequence: number): string;
export declare function normalizeRuleFinding(finding: NormalizableRuleFinding, pageUrl: string, pageNumber: number, sequence: number, serviceName?: string): NormalizedIssue;
export declare function normalizeAgentFinding(finding: NormalizableAgentFinding, pageUrl: string, pageNumber: number, sequence: number, serviceName?: string): NormalizedIssue;
export declare function normalizeVisionFinding(finding: NormalizableVisionFinding, pageUrl: string, pageNumber: number, sequence: number, serviceName?: string): NormalizedIssue;
export declare function compareNormalizedIssues(a: NormalizedIssue, b: NormalizedIssue): number;
//# sourceMappingURL=normalized-issue.d.ts.map
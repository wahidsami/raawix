/**
 * Compliance Scoring Utilities
 *
 * Scoring method:
 * - Pass = 1.0
 * - Fail = 0.0
 * - Needs Review = 0.5 (configurable)
 * - N/A = excluded from calculation
 */
import type { ScanRunSummary } from '@raawi-x/core';
export interface ComplianceScores {
    scoreA: number | null;
    scoreAA: number | null;
    needsReviewRate: number;
    totalRules: number;
    passedRules: number;
    failedRules: number;
    needsReviewRules: number;
    aCounts: {
        passed: number;
        failed: number;
        needsReview: number;
        total: number;
    };
    aaCounts: {
        passed: number;
        failed: number;
        needsReview: number;
        total: number;
    };
}
export interface RuleResult {
    level: 'A' | 'AA' | 'AAA' | 'Heuristic' | 'Review' | null;
    status: 'pass' | 'fail' | 'needs_review' | 'na';
}
/**
 * Rebuild compliance scores from a persisted ScanRun summary (e.g. partial/canceled scan
 * when Finding rows are missing but summaryJson was saved).
 */
export declare function complianceScoresFromScanRunSummary(summary: ScanRunSummary): ComplianceScores;
/**
 * Calculate compliance scores from rule results
 */
export declare function calculateComplianceScores(ruleResults: RuleResult[]): ComplianceScores;
/**
 * Aggregate scores from multiple scans (weighted by number of applicable findings)
 */
export declare function aggregateScores(scanScores: Array<{
    scores: ComplianceScores;
    pageCount: number;
}>): ComplianceScores;
//# sourceMappingURL=compliance-scoring.d.ts.map
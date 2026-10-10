import type { ScanRun } from '@raawi-x/core';
/**
 * Unified API response model derived from ScanRun (report.json)
 */
export interface ScanApiResponse {
    scanId: string;
    seedUrl: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startedAt: string;
    completedAt?: string;
    error?: string;
    summary: {
        totalPages: number;
        totalRules: number;
        aFailures: number;
        aaFailures: number;
        needsReview: number;
        byStatus: {
            pass: number;
            fail: number;
            needs_review: number;
            na: number;
        };
    };
    pages: Array<{
        pageNumber: number;
        url: string;
        title?: string;
        finalUrl?: string;
        status: 'success' | 'failed';
        error?: string;
        counts: {
            pass: number;
            fail: number;
            needs_review: number;
            na: number;
            total: number;
        };
        screenshotPath?: string;
    }>;
    findings: Array<{
        pageNumber: number;
        pageUrl: string;
        ruleId: string;
        wcagId?: string;
        level?: 'A' | 'AA' | 'AAA';
        status: 'pass' | 'fail' | 'needs_review' | 'na';
        confidence: 'high' | 'medium' | 'low';
        message?: string;
        evidence: Array<{
            type: 'element' | 'screenshot' | 'html' | 'text' | 'url' | 'style';
            value: string;
            selector?: string;
            description?: string;
            context?: string;
        }>;
        howToVerify: string;
        screenshotPath?: string;
    }>;
}
/**
 * Convert ScanRun to unified API response
 */
export declare function scanRunToApiResponse(scanRun: ScanRun, baseUrl?: string): ScanApiResponse;
/**
 * Legacy adapter: Convert ScanRun to legacy ScanResult format
 * For backward compatibility only
 */
export declare function scanRunToLegacyResult(scanRun: ScanRun): any;
//# sourceMappingURL=response-adapter.d.ts.map
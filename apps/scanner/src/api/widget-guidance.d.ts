import type { PageArtifact, PageRuleResults } from '@raawi-x/core';
/**
 * Page guidance extracted from scan artifacts
 */
export interface PageGuidance {
    url: string;
    normalizedUrl: string;
    title?: string;
    summary: string;
    landmarks: Landmark[];
    formSteps: FormStep[];
    keyActions: KeyAction[];
    lastScanned?: string;
    matchedUrl?: string;
    matchConfidence?: 'high' | 'medium' | 'low';
    scanTimestamp?: {
        startedAt?: string;
        completedAt?: string;
    };
    pageFingerprint?: import('@raawi-x/core').PageFingerprint;
}
export interface Landmark {
    type: 'main' | 'navigation' | 'complementary' | 'contentinfo' | 'search' | 'form' | 'banner';
    label?: string;
    selector?: string;
    description?: string;
}
export interface FormStep {
    stepNumber: number;
    label: string;
    fields: FormField[];
    description?: string;
}
export interface FormField {
    label?: string;
    type?: string;
    required?: boolean;
    selector?: string;
    description?: string;
}
export interface KeyAction {
    label: string;
    type: 'link' | 'button' | 'form-submit';
    selector?: string;
    description?: string;
    href?: string;
}
/**
 * Known issues for a page (user-friendly explanations)
 */
export interface PageIssues {
    url: string;
    normalizedUrl: string;
    issues: Issue[];
    lastScanned?: string;
    matchedUrl?: string;
    matchConfidence?: 'high' | 'medium' | 'low';
    scanTimestamp?: {
        startedAt?: string;
        completedAt?: string;
    };
    pageFingerprint?: import('@raawi-x/core').PageFingerprint;
}
export interface Issue {
    id: string;
    wcagId?: string;
    severity: 'critical' | 'important' | 'minor';
    title: string;
    description: string;
    userImpact: string;
    howToFix?: string;
    elementCount?: number;
}
/**
 * Extract page guidance from artifacts (enriched with vision findings)
 *
 * IMPORTANT: This guidance is used for STRUCTURE and METADATA only.
 * The widget ALWAYS reads live DOM for actual content.
 * This guidance provides:
 * - Page structure and ordering
 * - Landmarks and navigation hints
 * - Key actions descriptions
 * - Known accessibility issues
 *
 * Never use this to replace live page content.
 */
export declare function extractPageGuidance(artifact: PageArtifact, ruleResults?: PageRuleResults, scanId?: string): Promise<PageGuidance | null>;
/**
 * Extract known issues from rule results (user-friendly format, enriched with vision findings)
 */
export declare function extractPageIssues(artifact: PageArtifact, ruleResults?: PageRuleResults, scanId?: string): Promise<PageIssues | null>;
//# sourceMappingURL=widget-guidance.d.ts.map
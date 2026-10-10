/**
 * WCAG Rule Registry - Maps WCAG IDs to their metadata (level, title, etc.)
 * This is a shared registry that matches the one in the dashboard
 */
export interface WCAGRuleMeta {
    wcagId: string;
    level: 'A' | 'AA' | 'AAA';
    title: string;
}
/**
 * Get WCAG rule metadata by ID
 */
export declare function getWCAGRuleMeta(wcagId: string | null | undefined): WCAGRuleMeta | null;
/**
 * Get level for a finding from wcagId or ruleId
 * Returns: 'A' | 'AA' | 'AAA' | 'Heuristic' | 'Review' | null
 */
export declare function getFindingLevel(wcagId: string | null | undefined, ruleId?: string | null, dbLevel?: string | null): 'A' | 'AA' | 'AAA' | 'Heuristic' | 'Review' | null;
//# sourceMappingURL=wcag-rule-registry.d.ts.map
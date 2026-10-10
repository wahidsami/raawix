/**
 * WCAG Rules mapping - maps WCAG IDs to their titles and descriptions
 */
export interface WCAGRule {
    wcagId: string;
    title: {
        en: string;
        ar: string;
    };
    description: {
        en: string;
        ar: string;
    };
    level: 'A' | 'AA' | 'AAA';
}
export declare const wcagRulesMap: Record<string, WCAGRule>;
/**
 * Get WCAG rule information by ID
 */
export declare function getWCAGRule(wcagId: string | null | undefined): WCAGRule | null;
/**
 * Get WCAG rule title in specified language
 */
export declare function getWCAGRuleTitle(wcagId: string | null | undefined, language?: 'en' | 'ar'): string | null;
/**
 * Get WCAG rule description in specified language
 */
export declare function getWCAGRuleDescription(wcagId: string | null | undefined, language?: 'en' | 'ar'): string | null;
/**
 * Format WCAG ID with rule name
 */
export declare function formatWCAGId(wcagId: string | null | undefined, ruleId?: string, language?: 'en' | 'ar'): string;
/**
 * Get rule metadata (title, level, category) for a WCAG ID or rule ID
 * Returns metadata in both languages for i18n support
 */
export declare function getRuleMeta(wcagId: string | null | undefined, ruleId?: string): {
    titleEn: string;
    titleAr: string;
    level: string;
    category: string;
};
//# sourceMappingURL=wcag-metadata.d.ts.map
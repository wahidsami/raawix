export declare const reportCategories: {
    readonly Images: readonly ["Missing alt text", "Decorative images incorrectly announced", "Icons without labels", "CAPTCHA without alternatives", "Image-based buttons without description"];
    readonly Content: readonly ["Missing or incorrect headings structure (H1-H6)", "Poor readability (complex language)", "Missing page titles", "Incorrect language declaration", "Abbreviations not explained"];
    readonly 'Color & Contrast': readonly ["Low text contrast", "Low contrast for UI components", "Reliance on color alone", "Placeholder text too light to read", "Disabled states not distinguishable"];
    readonly 'Keyboard & Navigation': readonly ["Not accessible via keyboard", "Missing focus indicator", "Incorrect tab order", "Keyboard traps", "Missing skip links", "Navigation inconsistency"];
    readonly 'Forms & Inputs': readonly ["Missing labels", "Placeholder instead of label", "Missing error messages", "Errors not explained", "Required fields not indicated", "No input instructions", "Incorrect associations"];
    readonly Multimedia: readonly ["Missing captions", "Missing transcripts", "No audio descriptions", "Auto-play without control", "No pause/stop controls"];
    readonly 'Touch & Mobile': readonly ["Small tap targets", "Gesture-only interactions", "No gesture alternatives", "Elements too close", "No orientation support", "Motion without fallback"];
    readonly 'Structure & Semantics': readonly ["Missing ARIA roles", "Improper HTML structure", "Screen reader issues", "Inaccessible custom components", "Missing landmarks", "Duplicate IDs"];
    readonly 'Timing & Interaction': readonly ["Time limits without warning", "No extend option", "Auto-refresh", "Unstoppable animations", "Moving content without control"];
    readonly 'Assistive Technology': readonly ["Screen reader issues", "Voice control problems", "Zoom issues"];
    readonly 'Authentication & Security': readonly ["Cognitive complexity", "CAPTCHA barriers", "Memory-based challenges"];
};
export type ReportCategory = keyof typeof reportCategories;
export type ReportSubcategory = (typeof reportCategories)[ReportCategory][number];
export interface TaxonomyMatch {
    category: ReportCategory;
    subcategory: string;
}
export declare const defaultTaxonomyMatch: TaxonomyMatch;
export declare function getCategorySubcategories(category: ReportCategory): readonly string[];
export declare function getReportCategories(): ReportCategory[];
export declare function isReportCategory(value: unknown): value is ReportCategory;
export declare function isSubcategoryForCategory(category: ReportCategory, value: unknown): value is string;
export declare function normalizeTaxonomyMatch(input?: Partial<TaxonomyMatch> | null): TaxonomyMatch;
export declare function formatTaxonomyChecklistForPrompt(): string;
//# sourceMappingURL=report-taxonomy.d.ts.map
/**
 * Sanitize and validate regex patterns
 */
export interface SanitizedPattern {
    pattern: string;
    valid: boolean;
    error?: string;
}
/**
 * Sanitize a regex pattern
 */
export declare function sanitizePattern(pattern: string): SanitizedPattern;
/**
 * Sanitize an array of regex patterns
 */
export declare function sanitizePatterns(patterns: string[] | undefined): {
    patterns: string[];
    errors: string[];
};
//# sourceMappingURL=regex-sanitizer.d.ts.map
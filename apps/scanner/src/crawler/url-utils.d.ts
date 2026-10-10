/**
 * URL normalization and validation utilities
 */
export declare function normalizeUrl(url: string, baseUrl?: string): string;
export declare function getHostname(url: string): string;
export declare function isSameHostname(url1: string, url2: string): boolean;
export declare function matchesPattern(url: string, pattern: string): boolean;
export declare function shouldIncludeUrl(url: string, includePatterns?: string[], excludePatterns?: string[]): boolean;
export declare function extractLinks(html: string, baseUrl: string): string[];
/**
 * Compute canonical URL: strip hash, normalize trailing slash, lowercase host
 */
export declare function computeCanonicalUrl(url: string): string;
//# sourceMappingURL=url-utils.d.ts.map
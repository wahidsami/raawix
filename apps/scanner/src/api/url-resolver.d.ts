import type { PageArtifact } from '@raawi-x/core';
export type MatchConfidence = 'high' | 'medium' | 'low';
export interface PageMatch {
    page: PageArtifact;
    matchedUrl: string;
    matchConfidence: MatchConfidence;
    matchMethod: 'canonical' | 'final' | 'query-ignored' | 'fingerprint';
}
/**
 * Resolve page by URL using multiple matching strategies
 */
export declare function resolvePageByUrl(requestUrl: string, pages: PageArtifact[]): PageMatch | null;
//# sourceMappingURL=url-resolver.d.ts.map
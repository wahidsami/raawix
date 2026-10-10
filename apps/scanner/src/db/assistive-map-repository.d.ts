import type { AssistiveMap, ConfidenceSummary } from '../assistive/assistive-map-generator.js';
/**
 * Repository for assistive map persistence
 */
export declare class AssistiveMapRepository {
    private logger;
    constructor();
    /**
     * Get or create site by domain
     */
    getOrCreateSite(domain: string): Promise<string | null>;
    /**
     * Get or create page version
     */
    getOrCreatePageVersion(siteId: string, canonicalUrl: string, finalUrl: string | undefined, fingerprintHash: string, scanId: string | undefined): Promise<string | null>;
    /**
     * Upsert assistive map
     */
    upsertAssistiveMap(pageVersionId: string, map: AssistiveMap, confidenceSummary: ConfidenceSummary): Promise<boolean>;
    /**
     * Get assistive map for page version
     */
    getAssistiveMap(pageVersionId: string): Promise<{
        map: AssistiveMap;
        confidenceSummary: ConfidenceSummary;
    } | null>;
    /**
     * Find page version by URL (with matching strategies)
     */
    findPageVersionByUrl(domain: string, requestUrl: string, canonicalUrl: string): Promise<{
        pageVersionId: string;
        matchedUrl: string;
        matchConfidence: 'high' | 'medium' | 'low';
    } | null>;
}
export declare const assistiveMapRepository: AssistiveMapRepository;
//# sourceMappingURL=assistive-map-repository.d.ts.map
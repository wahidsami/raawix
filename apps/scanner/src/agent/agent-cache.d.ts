/**
 * In-memory cache for OpenAI analyst results.
 * Key: pageFingerprint:hash(stableCompactPayload):model
 * Value: analyst output JSON (enrichedFindings)
 * TTL from config.agentAnalyst.cacheTtlMs
 * Using stable compact input payload (not full interaction.json) reduces cache misses and ordering issues.
 */
export type CacheEntry = {
    enrichedFindings: Array<{
        kind: string;
        message: string;
        confidence: number;
        evidence: unknown;
        suggestedWcagIds?: string[];
        howToVerify?: string;
        source: 'openai';
    }>;
    cachedAt: number;
};
export declare function setAgentAnalystCacheTtl(ms: number): void;
/**
 * Build cache key from page identifier, stable compact input payload, and model name.
 * Use getStableCompactPayload(compactInput) from openai-analyst for the second argument.
 */
export declare function agentAnalystCacheKey(pageFingerprint: string, stableCompactPayload: string, model: string): string;
export declare function getAgentAnalystCached(key: string): CacheEntry['enrichedFindings'] | null;
export declare function setAgentAnalystCached(key: string, enrichedFindings: CacheEntry['enrichedFindings']): void;
//# sourceMappingURL=agent-cache.d.ts.map
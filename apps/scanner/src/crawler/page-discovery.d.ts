/**
 * Lightweight page discovery - extracts links without full page capture
 * Used for Phase 1: Discovery (fast, no scanning)
 */
export interface DiscoveryResult {
    urls: string[];
    total: number;
}
export declare class PageDiscovery {
    private browser;
    private scanId?;
    private maxPages;
    private maxDepth;
    private seedUrl;
    private seedHostname;
    private includePatterns?;
    private excludePatterns?;
    private scanMode;
    private readonly primaryNavTimeoutMs;
    private readonly fallbackNavTimeoutMs;
    private readonly httpFallbackTimeoutMs;
    constructor(seedUrl: string, maxPages: number, maxDepth: number, includePatterns?: string[], excludePatterns?: string[], scanId?: string, scanMode?: 'domain' | 'single');
    discover(): Promise<DiscoveryResult>;
    private navigateForDiscovery;
    private discoverLinksViaHttp;
    private initialize;
    private close;
}
//# sourceMappingURL=page-discovery.d.ts.map
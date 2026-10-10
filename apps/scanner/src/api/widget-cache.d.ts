import type { PageGuidance, PageIssues } from './widget-guidance.js';
/**
 * Simple in-memory cache for widget endpoints
 * TTL: 1 hour (configurable)
 */
declare class WidgetCache {
    private guidanceCache;
    private issuesCache;
    private semanticModelCache;
    private ttl;
    setGuidance(normalizedUrl: string, guidance: PageGuidance): void;
    getGuidance(normalizedUrl: string): PageGuidance | null;
    setIssues(normalizedUrl: string, issues: PageIssues): void;
    getIssues(normalizedUrl: string): PageIssues | null;
    setSemanticModel(normalizedUrl: string, semanticModel: Record<string, unknown>): void;
    getSemanticModel(normalizedUrl: string): Record<string, unknown> | null;
    clear(): void;
    cleanup(): void;
}
export declare const widgetCache: WidgetCache;
export {};
//# sourceMappingURL=widget-cache.d.ts.map
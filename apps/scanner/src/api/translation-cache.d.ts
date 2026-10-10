declare class TranslationCache {
    private cache;
    private ttl;
    /**
     * Get cached translation
     */
    get(textHash: string, targetLang: string): string | null;
    /**
     * Set cached translation
     */
    set(textHash: string, targetLang: string, translatedText: string): void;
    /**
     * Clear expired entries
     */
    cleanup(): void;
    /**
     * Clear all cache
     */
    clear(): void;
}
export declare const translationCache: TranslationCache;
export {};
//# sourceMappingURL=translation-cache.d.ts.map
class TranslationCache {
    cache = new Map();
    ttl = 60 * 60 * 1000; // 1 hour in milliseconds
    /**
     * Get cached translation
     */
    get(textHash, targetLang) {
        const key = `${textHash}:${targetLang}`;
        const cached = this.cache.get(key);
        if (!cached) {
            return null;
        }
        // Check if expired
        const now = Date.now();
        if (now - cached.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }
        return cached.translatedText;
    }
    /**
     * Set cached translation
     */
    set(textHash, targetLang, translatedText) {
        const key = `${textHash}:${targetLang}`;
        this.cache.set(key, {
            translatedText,
            timestamp: Date.now(),
        });
    }
    /**
     * Clear expired entries
     */
    cleanup() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.ttl) {
                this.cache.delete(key);
            }
        }
    }
    /**
     * Clear all cache
     */
    clear() {
        this.cache.clear();
    }
}
export const translationCache = new TranslationCache();
// Cleanup expired entries every 30 minutes
setInterval(() => {
    translationCache.cleanup();
}, 30 * 60 * 1000);
//# sourceMappingURL=translation-cache.js.map
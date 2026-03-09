/**
 * Translation Cache
 * Caches translations by (textHash, targetLang) for 1 hour
 */
interface CachedTranslation {
  translatedText: string;
  timestamp: number;
}

class TranslationCache {
  private cache: Map<string, CachedTranslation> = new Map();
  private ttl: number = 60 * 60 * 1000; // 1 hour in milliseconds

  /**
   * Get cached translation
   */
  get(textHash: string, targetLang: string): string | null {
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
  set(textHash: string, targetLang: string, translatedText: string): void {
    const key = `${textHash}:${targetLang}`;
    this.cache.set(key, {
      translatedText,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
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
  clear(): void {
    this.cache.clear();
  }
}

export const translationCache = new TranslationCache();

// Cleanup expired entries every 30 minutes
setInterval(() => {
  translationCache.cleanup();
}, 30 * 60 * 1000);


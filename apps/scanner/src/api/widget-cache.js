/**
 * Simple in-memory cache for widget endpoints
 * TTL: 1 hour (configurable)
 */
class WidgetCache {
    guidanceCache = new Map();
    issuesCache = new Map();
    semanticModelCache = new Map();
    ttl = 60 * 60 * 1000; // 1 hour
    setGuidance(normalizedUrl, guidance) {
        this.guidanceCache.set(normalizedUrl, {
            data: guidance,
            expires: Date.now() + this.ttl,
        });
    }
    getGuidance(normalizedUrl) {
        const cached = this.guidanceCache.get(normalizedUrl);
        if (!cached) {
            return null;
        }
        if (Date.now() > cached.expires) {
            this.guidanceCache.delete(normalizedUrl);
            return null;
        }
        return cached.data;
    }
    setIssues(normalizedUrl, issues) {
        this.issuesCache.set(normalizedUrl, {
            data: issues,
            expires: Date.now() + this.ttl,
        });
    }
    getIssues(normalizedUrl) {
        const cached = this.issuesCache.get(normalizedUrl);
        if (!cached) {
            return null;
        }
        if (Date.now() > cached.expires) {
            this.issuesCache.delete(normalizedUrl);
            return null;
        }
        return cached.data;
    }
    setSemanticModel(normalizedUrl, semanticModel) {
        this.semanticModelCache.set(normalizedUrl, {
            data: semanticModel,
            expires: Date.now() + this.ttl,
        });
    }
    getSemanticModel(normalizedUrl) {
        const cached = this.semanticModelCache.get(normalizedUrl);
        if (!cached) {
            return null;
        }
        if (Date.now() > cached.expires) {
            this.semanticModelCache.delete(normalizedUrl);
            return null;
        }
        return cached.data;
    }
    clear() {
        this.guidanceCache.clear();
        this.issuesCache.clear();
        this.semanticModelCache.clear();
    }
    // Clean up expired entries periodically
    cleanup() {
        const now = Date.now();
        for (const [url, cached] of this.guidanceCache.entries()) {
            if (now > cached.expires) {
                this.guidanceCache.delete(url);
            }
        }
        for (const [url, cached] of this.issuesCache.entries()) {
            if (now > cached.expires) {
                this.issuesCache.delete(url);
            }
        }
        for (const [url, cached] of this.semanticModelCache.entries()) {
            if (now > cached.expires) {
                this.semanticModelCache.delete(url);
            }
        }
    }
}
export const widgetCache = new WidgetCache();
// Clean up expired entries every 30 minutes
setInterval(() => {
    widgetCache.cleanup();
}, 30 * 60 * 1000);
//# sourceMappingURL=widget-cache.js.map
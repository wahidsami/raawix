import type { PageGuidance, PageIssues } from './widget-guidance.js';

/**
 * Simple in-memory cache for widget endpoints
 * TTL: 1 hour (configurable)
 */
class WidgetCache {
  private guidanceCache: Map<string, { data: PageGuidance; expires: number }> = new Map();
  private issuesCache: Map<string, { data: PageIssues; expires: number }> = new Map();
  private semanticModelCache: Map<string, { data: Record<string, unknown>; expires: number }> = new Map();
  private ttl: number = 60 * 60 * 1000; // 1 hour

  setGuidance(normalizedUrl: string, guidance: PageGuidance): void {
    this.guidanceCache.set(normalizedUrl, {
      data: guidance,
      expires: Date.now() + this.ttl,
    });
  }

  getGuidance(normalizedUrl: string): PageGuidance | null {
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

  setIssues(normalizedUrl: string, issues: PageIssues): void {
    this.issuesCache.set(normalizedUrl, {
      data: issues,
      expires: Date.now() + this.ttl,
    });
  }

  getIssues(normalizedUrl: string): PageIssues | null {
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

  setSemanticModel(normalizedUrl: string, semanticModel: Record<string, unknown>): void {
    this.semanticModelCache.set(normalizedUrl, {
      data: semanticModel,
      expires: Date.now() + this.ttl,
    });
  }

  getSemanticModel(normalizedUrl: string): Record<string, unknown> | null {
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

  clear(): void {
    this.guidanceCache.clear();
    this.issuesCache.clear();
    this.semanticModelCache.clear();
  }

  // Clean up expired entries periodically
  cleanup(): void {
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


/**
 * MapApiClient for Raawi X Widget (Phase 5.4)
 * 
 * Consumes scanner-generated page packages via `GET /api/widget/page-package`.
 * Implements strict payload validation, URL/confidence matching, timeout protection,
 * in-flight request deduplication, and in-memory caching.
 */

import type { PagePackageResponse, MapFetchStatus } from './types';

/**
 * MatchConfidence represents the URL/page resolution confidence returned by the scanner
 * (as defined in `apps/scanner/src/db/assistive-map-repository.ts` and `apps/scanner/src/api/url-resolver.ts`).
 */
export type MatchConfidenceLevel = 'high' | 'medium' | 'low';

export interface MatchConfidenceEvaluation {
  accepted: boolean;
  normalizedLevel: MatchConfidenceLevel;
  numericScore: number;
  reason?: string;
}

/**
 * Evaluates the matchConfidence contract according to Raawi X policy:
 * 
 * 1. String Enums (Actual Scanner Runtime Contract):
 *    - 'high': Exact canonical or final URL match -> ACCEPTED (Score: 1.0)
 *    - 'medium': Queryless/path-based URL match -> ACCEPTED (Score: 0.75)
 *    - 'low': Heuristic/fingerprint similarity or fallback -> REJECTED (Score: 0.30)
 * 
 * 2. Blueprint / Legacy Enum Aliases:
 *    - 'exact' | 'canonical' | 'final': Treated as 'high' -> ACCEPTED (Score: 1.0)
 *    - 'path' | 'query-ignored': Treated as 'medium' -> ACCEPTED (Score: 0.75)
 *    - 'fingerprint' | 'none': Treated as 'low' -> REJECTED (Score: 0.30)
 * 
 * 3. Numeric Scores (Normalized):
 *    - Score >= 0.85: 'high' -> ACCEPTED
 *    - Score >= 0.65: 'medium' -> ACCEPTED
 *    - Score < 0.65: 'low' -> REJECTED
 * 
 * 4. Missing / Null / Unrecognized:
 *    - REJECTED
 */
export function evaluateMatchConfidence(rawConfidence: unknown): MatchConfidenceEvaluation {
  if (rawConfidence === undefined || rawConfidence === null) {
    return {
      accepted: false,
      normalizedLevel: 'low',
      numericScore: 0,
      reason: 'Missing matchConfidence in payload',
    };
  }

  // Handle String Enum Contract
  if (typeof rawConfidence === 'string') {
    const normalized = rawConfidence.trim().toLowerCase();
    switch (normalized) {
      case 'high':
      case 'exact':
      case 'canonical':
      case 'final':
        return {
          accepted: true,
          normalizedLevel: 'high',
          numericScore: 1.0,
        };

      case 'medium':
      case 'path':
      case 'query-ignored':
        return {
          accepted: true,
          normalizedLevel: 'medium',
          numericScore: 0.75,
        };

      case 'low':
      case 'fingerprint':
      case 'none':
        return {
          accepted: false,
          normalizedLevel: 'low',
          numericScore: 0.3,
          reason: `Low match confidence enum: '${rawConfidence}'`,
        };

      default:
        return {
          accepted: false,
          normalizedLevel: 'low',
          numericScore: 0,
          reason: `Unrecognized match confidence enum: '${rawConfidence}'`,
        };
    }
  }

  // Handle Numeric Score (0.0 to 1.0) if present in fixtures or normalized pipelines
  if (typeof rawConfidence === 'number') {
    if (isNaN(rawConfidence)) {
      return {
        accepted: false,
        normalizedLevel: 'low',
        numericScore: 0,
        reason: 'NaN numeric confidence value',
      };
    }

    if (rawConfidence >= 0.85) {
      return {
        accepted: true,
        normalizedLevel: 'high',
        numericScore: rawConfidence,
      };
    } else if (rawConfidence >= 0.65) {
      return {
        accepted: true,
        normalizedLevel: 'medium',
        numericScore: rawConfidence,
      };
    } else {
      return {
        accepted: false,
        normalizedLevel: 'low',
        numericScore: rawConfidence,
        reason: `Numeric confidence ${rawConfidence} below minimum threshold (0.65)`,
      };
    }
  }

  return {
    accepted: false,
    normalizedLevel: 'low',
    numericScore: 0,
    reason: `Invalid matchConfidence type: ${typeof rawConfidence}`,
  };
}

export interface ApiClientOptions {
  apiUrl?: string;
  entityCode?: string;
  timeoutMs?: number;
}

export type StatusListener = (status: MapFetchStatus, data: PagePackageResponse | null, error?: string) => void;

export class MapApiClient {
  private apiUrl: string;
  private entityCode: string;
  private timeoutMs: number;

  private currentStatus: MapFetchStatus = 'idle';
  private currentData: PagePackageResponse | null = null;
  private currentError: string | null = null;

  private cache: Map<string, PagePackageResponse> = new Map();
  private inFlightRequests: Map<string, Promise<PagePackageResponse | null>> = new Map();
  private abortControllers: Set<AbortController> = new Set();
  private listeners: Set<StatusListener> = new Set();

  constructor(options?: ApiClientOptions) {
    this.apiUrl = options?.apiUrl ?? this.detectApiUrl();
    this.entityCode = options?.entityCode ?? this.detectEntityCode();
    this.timeoutMs = options?.timeoutMs ?? 5000;
  }

  public getStatus(): MapFetchStatus {
    return this.currentStatus;
  }

  public getApiUrl(): string {
    return this.apiUrl;
  }

  public getEntityCode(): string {
    return this.entityCode;
  }

  public getData(): PagePackageResponse | null {
    return this.currentData;
  }

  public getError(): string | null {
    return this.currentError;
  }

  public subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    // Fire immediately with current state
    listener(this.currentStatus, this.currentData, this.currentError ?? undefined);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(status: MapFetchStatus, data: PagePackageResponse | null, error?: string): void {
    this.currentStatus = status;
    this.currentData = data;
    this.currentError = error ?? null;
    this.listeners.forEach((listener) => {
      try {
        listener(status, data, error);
      } catch (err) {
        console.error('[RaawiX ApiClient] Listener error:', err);
      }
    });
  }

  /**
   * Fetches the page package for the specified URL (or current window location)
   */
  public async fetchPagePackage(targetUrl?: string, forceRefresh: boolean = false): Promise<PagePackageResponse | null> {
    const rawUrl = targetUrl ?? (typeof window !== 'undefined' ? window.location.href : '');
    if (!rawUrl) {
      this.notify('error', null, 'Target URL is missing');
      return null;
    }

    if (!this.apiUrl) {
      this.notify('not-scanned', null, 'API URL not configured');
      return null;
    }

    const canonicalUrl = this.canonicalizeUrl(rawUrl);
    const cacheKey = `${this.entityCode}:${canonicalUrl}`;

    // 1. Check in-memory cache unless forced
    if (!forceRefresh && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      this.notify('ready', cached);
      return cached;
    }

    // 2. Check in-flight request deduplication
    if (this.inFlightRequests.has(cacheKey)) {
      return this.inFlightRequests.get(cacheKey)!;
    }

    this.notify('loading', null);

    const controller = new AbortController();
    this.abortControllers.add(controller);

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.timeoutMs);

    const requestPromise = (async () => {
      try {
        const queryParams = new URLSearchParams({
          url: canonicalUrl,
        });
        if (this.entityCode) {
          queryParams.append('entityCode', this.entityCode);
        }

        const endpoint = `${this.apiUrl.replace(/\/+$/, '')}/api/widget/page-package?${queryParams.toString()}`;
        const fetchFn = (typeof window !== 'undefined' && window.fetch) ? window.fetch.bind(window) : globalThis.fetch;
        const response = await fetchFn(endpoint, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 404) {
          this.notify('not-scanned', null, 'Page not scanned yet');
          return null;
        }

        if (!response.ok) {
          this.notify('error', null, `HTTP ${response.status}: Failed to fetch page package`);
          return null;
        }

        const json = await response.json();

        // 3. Validate response structure
        const validated = this.validatePagePackage(json, canonicalUrl);
        if (!validated) {
          return null;
        }

        // 4. Cache valid payload
        this.cache.set(cacheKey, validated);
        this.notify('ready', validated);
        return validated;
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          this.notify('error', null, 'Request timeout');
        } else {
          this.notify('offline', null, err.message || 'Network error / offline');
        }
        return null;
      } finally {
        this.abortControllers.delete(controller);
        this.inFlightRequests.delete(cacheKey);
      }
    })();

    this.inFlightRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  /**
   * Validates the schema and page URL match of the returned package
   */
  public validatePagePackage(payload: any, currentCanonicalUrl: string): PagePackageResponse | null {
    if (!payload || typeof payload !== 'object') {
      this.notify('error', null, 'Malformed API response: payload is not an object');
      return null;
    }

    // Evaluate matchConfidence against explicit policy
    const evalResult = evaluateMatchConfidence(payload.matchConfidence);
    if (!evalResult.accepted) {
      this.notify('mismatch', null, `Mapping data rejected: ${evalResult.reason}`);
      return null;
    }

    // URL validation: verify matchedUrl corresponds to current domain
    if (payload.matchedUrl && typeof payload.matchedUrl === 'string') {
      try {
        const matchedHost = new URL(payload.matchedUrl).hostname;
        const currentHost = new URL(currentCanonicalUrl).hostname;
        if (matchedHost && currentHost && matchedHost !== currentHost) {
          this.notify('mismatch', null, `Domain mismatch: matched ${matchedHost} on ${currentHost}`);
          return null;
        }
      } catch {
        // Continue if URL parsing fails on relative mock URLs
      }
    }

    // Assistive map structure check
    if (payload.assistiveMap && typeof payload.assistiveMap !== 'object') {
      this.notify('error', null, 'Invalid assistiveMap structure in package');
      return null;
    }

    return payload as PagePackageResponse;
  }

  /**
   * Canonicalizes URL for consistent cache keys and query params
   */
  public canonicalizeUrl(rawUrl: string): string {
    try {
      const parsed = new URL(rawUrl);
      parsed.hash = ''; // Strip fragment
      // Strip common analytics query parameters
      const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
      paramsToRemove.forEach((p) => parsed.searchParams.delete(p));
      return parsed.toString();
    } catch {
      return rawUrl;
    }
  }

  private detectApiUrl(): string {
    if (typeof document !== 'undefined') {
      const docAttr = document.documentElement.getAttribute('data-raawi-api-url')
        || document.documentElement.getAttribute('data-rawi-api-url');
      if (docAttr) return docAttr;
    }
    if (typeof window === 'undefined') return '';
    return (window as any).RAAWI_API_URL || (window as any).RAWI_API_URL || (typeof location !== 'undefined' ? location.origin : '');
  }

  private detectEntityCode(): string {
    if (typeof document !== 'undefined') {
      const docAttr = document.documentElement.getAttribute('data-raawi-entity-code')
        || document.documentElement.getAttribute('data-rawi-entity-code');
      if (docAttr) return docAttr;
    }
    if (typeof window === 'undefined') return '';
    return (window as any).RAAWI_ENTITY_CODE || (window as any).RAWI_ENTITY_CODE || '';
  }

  public setApiUrl(url: string): void {
    this.apiUrl = url;
  }

  public setEntityCode(code: string): void {
    this.entityCode = code;
  }

  public clearCache(): void {
    this.cache.clear();
  }

  public destroy(): void {
    // Abort all in-flight requests
    this.abortControllers.forEach((controller) => {
      try {
        controller.abort();
      } catch {}
    });
    this.abortControllers.clear();
    this.inFlightRequests.clear();
    this.cache.clear();
    this.listeners.clear();
    this.currentStatus = 'idle';
    this.currentData = null;
    this.currentError = null;
  }
}

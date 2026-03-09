import { normalizeUrl, computeCanonicalUrl } from '../crawler/url-utils.js';
import type { PageArtifact, PageFingerprint } from '@raawi-x/core';

export type MatchConfidence = 'high' | 'medium' | 'low';

export interface PageMatch {
  page: PageArtifact;
  matchedUrl: string;
  matchConfidence: MatchConfidence;
  matchMethod: 'canonical' | 'final' | 'query-ignored' | 'fingerprint';
}

/**
 * Resolve page by URL using multiple matching strategies
 */
export function resolvePageByUrl(
  requestUrl: string,
  pages: PageArtifact[]
): PageMatch | null {
  const normalizedRequest = normalizeUrl(requestUrl);
  const canonicalRequest = computeCanonicalUrl(requestUrl);
  
  // Strategy 1: Exact canonical URL match (highest confidence)
  for (const page of pages) {
    if (page.canonicalUrl && page.canonicalUrl === canonicalRequest) {
      return {
        page,
        matchedUrl: page.canonicalUrl,
        matchConfidence: 'high',
        matchMethod: 'canonical',
      };
    }
  }

  // Strategy 2: Final URL match (high confidence)
  for (const page of pages) {
    if (page.finalUrl) {
      const normalizedFinal = normalizeUrl(page.finalUrl);
      if (normalizedFinal === normalizedRequest) {
        return {
          page,
          matchedUrl: page.finalUrl,
          matchConfidence: 'high',
          matchMethod: 'final',
        };
      }
    }
  }

  // Strategy 3: Best-effort match ignoring query params (medium confidence)
  const requestWithoutQuery = new URL(requestUrl);
  requestWithoutQuery.search = '';
  const requestPath = requestWithoutQuery.toString();
  
  for (const page of pages) {
    if (page.finalUrl) {
      const pageWithoutQuery = new URL(page.finalUrl);
      pageWithoutQuery.search = '';
      if (pageWithoutQuery.toString() === requestPath) {
        return {
          page,
          matchedUrl: page.finalUrl,
          matchConfidence: 'medium',
          matchMethod: 'query-ignored',
        };
      }
    }
  }

  // Strategy 4: Fingerprint similarity (low confidence)
  // Match by title + first heading
  const requestFingerprint = extractFingerprintFromUrl(requestUrl);
  if (requestFingerprint) {
    for (const page of pages) {
      if (page.pageFingerprint) {
        const similarity = compareFingerprints(requestFingerprint, page.pageFingerprint);
        if (similarity > 0.5) {
          return {
            page,
            matchedUrl: page.finalUrl || page.url,
            matchConfidence: 'low',
            matchMethod: 'fingerprint',
          };
        }
      }
    }
  }

  return null;
}

/**
 * Extract fingerprint from URL (not used in server-side resolution)
 * Widget computes fingerprint from live DOM
 */
function extractFingerprintFromUrl(url: string): Partial<PageFingerprint> | null {
  // Server-side resolution doesn't need this - widget handles fingerprint comparison
  return null;
}

/**
 * Compare two fingerprints and return similarity score (0-1)
 */
function compareFingerprints(
  fp1: Partial<PageFingerprint>,
  fp2: PageFingerprint
): number {
  let score = 0;
  let factors = 0;

  // Title match
  if (fp1.title && fp2.title) {
    factors++;
    if (fp1.title.toLowerCase() === fp2.title.toLowerCase()) {
      score += 0.5;
    } else if (fp1.title.toLowerCase().includes(fp2.title.toLowerCase()) || 
               fp2.title.toLowerCase().includes(fp1.title.toLowerCase())) {
      score += 0.3;
    }
  }

  // First heading match
  if (fp1.firstHeading && fp2.firstHeading) {
    factors++;
    if (fp1.firstHeading.toLowerCase() === fp2.firstHeading.toLowerCase()) {
      score += 0.5;
    } else if (fp1.firstHeading.toLowerCase().includes(fp2.firstHeading.toLowerCase()) ||
               fp2.firstHeading.toLowerCase().includes(fp1.firstHeading.toLowerCase())) {
      score += 0.3;
    }
  }

  // Main text hash match (exact)
  if (fp1.mainTextHash && fp2.mainTextHash) {
    factors++;
    if (fp1.mainTextHash === fp2.mainTextHash) {
      score += 1.0;
    }
  }

  return factors > 0 ? score / factors : 0;
}


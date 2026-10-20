/**
 * FreshnessEngine for Raawi X Widget (Phase 5.5)
 * 
 * Computes live page fingerprints matching the scanner crawler contract
 * (`apps/scanner/src/crawler/page-fingerprint.ts`), and evaluates whether
 * an AssistiveMap package remains fresh or has become stale due to content changes.
 */

import type { PageFingerprint } from './types';

export type FreshnessStatus = 'ready' | 'outdated' | 'unknown';

export interface FreshnessEvaluation {
  status: FreshnessStatus;
  isStale: boolean;
  score: number; // 0.0 (completely stale) to 1.0 (exact match)
  matchedFields: string[];
  mismatchedFields: string[];
  reason?: string;
}

/**
 * Computes a standard SHA-256 hex digest for arbitrary UTF-8 text.
 * Bit-for-bit identical to Node `crypto.createHash('sha256')` and `crypto.subtle`.
 * Works synchronously in both browser and Node/JSDOM testing environments.
 */
export function computeSha256(str: string): string {
  // UTF-8 encode string to byte stream
  const unescaped = encodeURIComponent(str).replace(
    /%([0-9A-F]{2})/g,
    (_, p1) => String.fromCharCode(parseInt(p1, 16))
  );
  const ascii = unescaped;

  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;
  let hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;
  const isComposite: Record<number, boolean> = {};

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = candidate * 2; i <= 311; i += candidate) {
        isComposite[i] = true;
      }
      if (primeCounter < 8) {
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      }
      k[primeCounter] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      primeCounter++;
    }
  }

  let s = ascii + '\x80';
  while (s.length % 64 !== 56) {
    s += '\x00';
  }

  for (let i = 0; i < s.length; i++) {
    const j = s.charCodeAt(i);
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }

  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength | 0;

  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);

    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const s0 = i >= 16 ? rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3) : 0;
      const s1 = i >= 16 ? rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10) : 0;

      if (i >= 16) {
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }

      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 =
        (hash[7] +
          (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) +
          ch +
          k[i] +
          w[i]) |
        0;
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 =
        ((rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj) | 0;

      hash = [
        (temp1 + temp2) | 0,
        hash[0],
        hash[1],
        hash[2],
        (hash[3] + temp1) | 0,
        hash[4],
        hash[5],
        hash[6],
      ];
    }

    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  let result = '';
  for (let i = 0; i < 8; i++) {
    for (let b = 3; b >= 0; b--) {
      const byte = (hash[i] >> (b * 8)) & 255;
      result += byte.toString(16).padStart(2, '0');
    }
  }

  return result;
}

/**
 * Computes the page fingerprint from the live DOM using the same algorithm
 * implemented in `apps/scanner/src/crawler/page-fingerprint.ts`:
 * 1. Title: document.title trimmed
 * 2. First Heading: first H1, or first H2 text trimmed
 * 3. Main Text Hash: normalized text of <main> (or body fallback), truncated to 2000 chars, SHA-256 hashed.
 *
 * Excludes the accessibility widget itself (`raawi-accessibility-widget` and `[data-raawi-owned]`)
 * to avoid widget insertion altering the host page's fingerprint.
 */
export function computeLivePageFingerprint(doc?: Document): PageFingerprint {
  const documentRef = doc || (typeof document !== 'undefined' ? document : null);
  if (!documentRef) {
    return {};
  }

  const fingerprint: PageFingerprint = {};

  // 1. Title
  const title = documentRef.title?.trim();
  if (title) {
    fingerprint.title = title;
  }

  // 2. First H1 or H2
  const h1 = documentRef.querySelector('h1');
  const h2 = documentRef.querySelector('h2');
  if (h1 && h1.textContent && h1.textContent.trim().length > 0) {
    fingerprint.firstHeading = h1.textContent.trim();
  } else if (h2 && h2.textContent && h2.textContent.trim().length > 0) {
    fingerprint.firstHeading = h2.textContent.trim();
  }

  // 3. Main Content Hash
  const mainEl = documentRef.querySelector('main') || documentRef.body || documentRef.documentElement;
  if (mainEl) {
    // Clone or traverse while ignoring widget DOM, script and style tags
    let rawHtml = '';
    try {
      rawHtml = mainEl.innerHTML || '';
    } catch {
      rawHtml = mainEl.textContent || '';
    }

    const textContent = rawHtml
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
      .replace(/<raawi-accessibility-widget[\s\S]*?<\/raawi-accessibility-widget>/gi, '') // Exclude widget
      .replace(/<[^>]+data-raawi-owned[^>]*>[\s\S]*?<\/[^>]+>/gi, '') // Exclude widget-owned elements
      .replace(/<[^>]+>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Truncate to first 2000 chars to avoid dynamic transient content at end of page
    const truncatedText = textContent.substring(0, 2000);
    if (truncatedText.length > 0) {
      fingerprint.mainTextHash = computeSha256(truncatedText);
    }
  }

  return fingerprint;
}

/**
 * Evaluates the freshness of a scanner package against a live page fingerprint.
 * 
 * Decision Logic:
 * - Missing or empty package fingerprint -> 'unknown' (conservative representation).
 * - Title mismatch (ignoring case) -> 'outdated' (isStale = true).
 * - First heading mismatch (ignoring case) -> 'outdated' (isStale = true).
 * - MainTextHash mismatch (when present in both) -> 'outdated' (isStale = true).
 * - All available fields match -> 'ready' (isStale = false).
 */
export function evaluateFreshness(
  packageFingerprint: PageFingerprint | null | undefined,
  liveFingerprint: PageFingerprint
): FreshnessEvaluation {
  if (!packageFingerprint || Object.keys(packageFingerprint).length === 0) {
    return {
      status: 'unknown',
      isStale: false,
      score: 0.5,
      matchedFields: [],
      mismatchedFields: [],
      reason: 'Package lacks fingerprint data; content freshness cannot be verified',
    };
  }

  const matchedFields: string[] = [];
  const mismatchedFields: string[] = [];

  // Check Title
  if (packageFingerprint.title && liveFingerprint.title) {
    if (packageFingerprint.title.trim().toLowerCase() === liveFingerprint.title.trim().toLowerCase()) {
      matchedFields.push('title');
    } else {
      mismatchedFields.push('title');
    }
  }

  // Check First Heading
  if (packageFingerprint.firstHeading && liveFingerprint.firstHeading) {
    if (packageFingerprint.firstHeading.trim().toLowerCase() === liveFingerprint.firstHeading.trim().toLowerCase()) {
      matchedFields.push('firstHeading');
    } else {
      mismatchedFields.push('firstHeading');
    }
  }

  // Check Main Text Hash
  if (packageFingerprint.mainTextHash && liveFingerprint.mainTextHash) {
    if (packageFingerprint.mainTextHash === liveFingerprint.mainTextHash) {
      matchedFields.push('mainTextHash');
    } else {
      mismatchedFields.push('mainTextHash');
    }
  }

  const totalCompared = matchedFields.length + mismatchedFields.length;
  if (totalCompared === 0) {
    return {
      status: 'unknown',
      isStale: false,
      score: 0.5,
      matchedFields: [],
      mismatchedFields: [],
      reason: 'No overlapping fingerprint fields available to compare',
    };
  }

  // If title or primary heading has changed, the page identity has changed -> OUTDATED
  if (mismatchedFields.includes('title')) {
    return {
      status: 'outdated',
      isStale: true,
      score: matchedFields.length / totalCompared,
      matchedFields,
      mismatchedFields,
      reason: `Page title changed (package: "${packageFingerprint.title}", current: "${liveFingerprint.title}")`,
    };
  }

  if (mismatchedFields.includes('firstHeading')) {
    return {
      status: 'outdated',
      isStale: true,
      score: matchedFields.length / totalCompared,
      matchedFields,
      mismatchedFields,
      reason: `Primary heading changed (package: "${packageFingerprint.firstHeading}", current: "${liveFingerprint.firstHeading}")`,
    };
  }

  // If title and heading match, but mainTextHash differs -> OUTDATED
  if (mismatchedFields.includes('mainTextHash')) {
    return {
      status: 'outdated',
      isStale: true,
      score: matchedFields.length / totalCompared,
      matchedFields,
      mismatchedFields,
      reason: 'Main page content has changed significantly since scan',
    };
  }

  // All compared fields match -> READY
  return {
    status: 'ready',
    isStale: false,
    score: 1.0,
    matchedFields,
    mismatchedFields: [],
  };
}

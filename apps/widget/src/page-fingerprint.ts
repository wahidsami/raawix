/**
 * Compute page fingerprint in browser (for stale scan detection)
 */

export interface PageFingerprint {
  title?: string;
  firstHeading?: string;
  mainTextHash?: string;
}

/**
 * Compute page fingerprint from live DOM
 */
export function computePageFingerprint(): PageFingerprint {
  const fingerprint: PageFingerprint = {};

  // Title
  const title = document.title?.trim();
  if (title) {
    fingerprint.title = title;
  }

  // First H1 or H2
  const h1 = document.querySelector('h1');
  const h2 = document.querySelector('h2');
  
  if (h1 && h1.textContent) {
    fingerprint.firstHeading = h1.textContent.trim();
  } else if (h2 && h2.textContent) {
    fingerprint.firstHeading = h2.textContent.trim();
  }

  // Main content hash
  const main = document.querySelector('main') || document.body;
  if (main) {
    // Extract text content (similar to server-side)
    const textContent = main.textContent
      ?.replace(/\s+/g, ' ')
      .trim() || '';
    
    // Truncate to first 2000 chars (same as server)
    const truncatedText = textContent.substring(0, 2000);
    
    if (truncatedText.length > 0) {
      // Simple hash function (for browser compatibility)
      fingerprint.mainTextHash = simpleHash(truncatedText);
    }
  }

  return fingerprint;
}

/**
 * Simple hash function (browser-compatible, not cryptographically secure)
 * For fingerprint comparison only
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to hex string
  return Math.abs(hash).toString(16);
}

/**
 * Compare two fingerprints and return similarity score (0-1)
 */
export function compareFingerprints(
  fp1: PageFingerprint,
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


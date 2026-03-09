import { createHash } from 'node:crypto';
import type { PageFingerprint } from '@raawi-x/core';

/**
 * Compute page fingerprint for matching pages across scans
 */
export function computePageFingerprint(
  title: string | undefined,
  html: string
): PageFingerprint {
  const fingerprint: PageFingerprint = {};

  // Title
  if (title) {
    fingerprint.title = title.trim();
  }

  // Extract first H1 or H2
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const h2Match = html.match(/<h2[^>]*>([^<]+)<\/h2>/i);
  
  if (h1Match) {
    fingerprint.firstHeading = h1Match[1].trim();
  } else if (h2Match) {
    fingerprint.firstHeading = h2Match[1].trim();
  }

  // Extract main content and compute hash
  // Find <main> element or use body as fallback
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  
  const contentHtml = mainMatch ? mainMatch[1] : (bodyMatch ? bodyMatch[1] : html);
  
  // Extract text content (remove HTML tags, normalize whitespace)
  const textContent = contentHtml
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
    .replace(/<[^>]+>/g, ' ') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Truncate to first 2000 chars to keep stable (avoid dynamic content at end)
  const truncatedText = textContent.substring(0, 2000);
  
  // Compute hash
  if (truncatedText.length > 0) {
    fingerprint.mainTextHash = createHash('sha256').update(truncatedText).digest('hex');
  }

  return fingerprint;
}


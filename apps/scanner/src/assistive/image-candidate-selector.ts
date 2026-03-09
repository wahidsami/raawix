
/**
 * Candidate selection rules for image description generation
 * Only generate descriptions when images meet quality criteria
 */
export class ImageCandidateSelector {
  /**
   * Low-quality alt text patterns that should be replaced
   */
  private static readonly LOW_QUALITY_ALT_PATTERNS = [
    /^image$/i,
    /^photo$/i,
    /^picture$/i,
    /^img$/i,
    /^img_\d+$/i,
    /^banner$/i,
    /^spacer$/i,
    /^divider$/i,
    /^placeholder$/i,
    /^\d+$/i, // Just numbers
    /^[a-z]\.(jpg|png|gif|svg|webp)$/i, // Just filename
  ];

  /**
   * Decorative filename patterns
   */
  private static readonly DECORATIVE_FILENAME_PATTERNS = [
    /sprite/i,
    /icon/i,
    /spacer/i,
    /divider/i,
    /bullet/i,
    /arrow/i,
    /decorative/i,
  ];

  /**
   * Check if image is a valid candidate for description generation
   */
  static isCandidate(img: Element): {
    isCandidate: boolean;
    reason?: string;
  } {
    // Must be an img element
    if (img.tagName.toLowerCase() !== 'img') {
      return { isCandidate: false, reason: 'Not an img element' };
    }

    // Skip if aria-hidden="true"
    const ariaHidden = img.getAttribute('aria-hidden');
    if (ariaHidden === 'true') {
      return { isCandidate: false, reason: 'aria-hidden="true"' };
    }

    // Skip if role="presentation"
    const role = img.getAttribute('role');
    if (role === 'presentation') {
      return { isCandidate: false, reason: 'role="presentation"' };
    }

    // Check alt attribute
    const alt = img.getAttribute('alt');
    const src = img.getAttribute('src') || '';

    // If alt is missing, it's a candidate
    if (alt === null) {
      return { isCandidate: true };
    }

    // If alt is empty string, check if likely decorative
    if (alt === '') {
      // Check if filename suggests decorative
      const isDecorativeFilename = this.DECORATIVE_FILENAME_PATTERNS.some((pattern) =>
        pattern.test(src)
      );

      // If decorative filename and empty alt, likely decorative - skip
      if (isDecorativeFilename) {
        return { isCandidate: false, reason: 'Empty alt with decorative filename' };
      }

      // Empty alt but not decorative - candidate (might be content image)
      return { isCandidate: true };
    }

    // If alt exists, check if it's low quality
    const isLowQuality = this.LOW_QUALITY_ALT_PATTERNS.some((pattern) => pattern.test(alt.trim()));

    if (isLowQuality) {
      return { isCandidate: true, reason: 'Low-quality alt text' };
    }

    // Has meaningful alt - not a candidate
    return { isCandidate: false, reason: 'Has meaningful alt text' };
  }

  /**
   * Check if image filename suggests decorative use
   */
  static isDecorativeFilename(src: string): boolean {
    return this.DECORATIVE_FILENAME_PATTERNS.some((pattern) => pattern.test(src));
  }

  /**
   * Get nearby context for image (heading or caption)
   */
  static getNearbyContext(img: Element): string | null {
    // Check for figcaption
    const parent = img.parentElement;
    if (parent && parent.tagName.toLowerCase() === 'figure') {
      const figcaption = parent.querySelector('figcaption');
      if (figcaption && figcaption.textContent) {
        return figcaption.textContent.trim().substring(0, 100); // Max 100 chars
      }
    }

    // Check for previous heading
    let current: Element | null = img.previousElementSibling;
    let depth = 0;
    while (current && depth < 3) {
      const tagName = current.tagName.toLowerCase();
      if (tagName.startsWith('h') && /^h[1-6]$/.test(tagName)) {
        const headingText = current.textContent?.trim();
        if (headingText) {
          return headingText.substring(0, 100);
        }
      }
      current = current.previousElementSibling;
      depth++;
    }

    // Check parent heading
    let parentElement: Element | null = img.parentElement;
    depth = 0;
    while (parentElement && depth < 2) {
      const tagName = parentElement.tagName.toLowerCase();
      if (tagName.startsWith('h') && /^h[1-6]$/.test(tagName)) {
        const headingText = parentElement.textContent?.trim();
        if (headingText) {
          return headingText.substring(0, 100);
        }
      }
      parentElement = parentElement.parentElement;
      depth++;
    }

    return null;
  }
}


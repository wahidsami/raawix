/**
 * URL normalization and validation utilities
 */

export function normalizeUrl(url: string, baseUrl?: string): string {
  try {
    const parsed = baseUrl ? new URL(url, baseUrl) : new URL(url);
    
    // Remove hash
    parsed.hash = '';
    
    // Normalize trailing slash for directory-like URLs
    // Keep trailing slash if pathname ends with / or is just /
    if (parsed.pathname !== '/' && !parsed.pathname.endsWith('/')) {
      // Only add trailing slash if there's no file extension
      const hasExtension = /\.[a-zA-Z0-9]+$/.test(parsed.pathname.split('/').pop() || '');
      if (!hasExtension && parsed.search === '' && parsed.hash === '') {
        // Don't add trailing slash, keep as is
      }
    }
    
    return parsed.toString();
  } catch (error) {
    throw new Error(`Invalid URL: ${url}`);
  }
}

export function getHostname(url: string): string {
  try {
    const urlObj = new URL(url);
    // Include port if present (important for localhost with different ports)
    // host includes both hostname and port (e.g., "localhost:4173")
    // hostname is just the hostname without port (e.g., "localhost")
    return urlObj.port ? `${urlObj.hostname}:${urlObj.port}` : urlObj.hostname;
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
}

export function isSameHostname(url1: string, url2: string): boolean {
  try {
    return getHostname(url1) === getHostname(url2);
  } catch {
    return false;
  }
}

export function matchesPattern(url: string, pattern: string): boolean {
  try {
    const regex = new RegExp(pattern);
    return regex.test(url);
  } catch {
    // Invalid regex, treat as literal string match
    return url.includes(pattern);
  }
}

export function shouldIncludeUrl(
  url: string,
  includePatterns?: string[],
  excludePatterns?: string[]
): boolean {
  // If include patterns exist, URL must match at least one
  if (includePatterns && includePatterns.length > 0) {
    const matchesInclude = includePatterns.some((pattern) => matchesPattern(url, pattern));
    if (!matchesInclude) {
      return false;
    }
  }

  // If exclude patterns exist, URL must not match any
  if (excludePatterns && excludePatterns.length > 0) {
    const matchesExclude = excludePatterns.some((pattern) => matchesPattern(url, pattern));
    if (matchesExclude) {
      return false;
    }
  }

  return true;
}

export function extractLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const seen = new Set<string>();
  
  // Pattern 1: Standard <a> tags with href
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    if (href && !href.startsWith('#') && !href.startsWith('javascript:') && !href.startsWith('mailto:')) {
      try {
        const normalized = normalizeUrl(href, baseUrl);
        if (!seen.has(normalized)) {
          links.push(normalized);
          seen.add(normalized);
        }
      } catch {
        // Skip invalid URLs
      }
    }
  }
  
  // Pattern 2: React Router Link components (they render as <a> but might have data attributes)
  // Look for elements with data-href, data-to, or similar attributes
  const reactLinkRegex = /<a[^>]+(?:data-href|data-to|data-link)=["']([^"']+)["'][^>]*>/gi;
  while ((match = reactLinkRegex.exec(html)) !== null) {
    const href = match[1];
    if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      try {
        const normalized = normalizeUrl(href, baseUrl);
        if (!seen.has(normalized)) {
          links.push(normalized);
          seen.add(normalized);
        }
      } catch {
        // Skip invalid URLs
      }
    }
  }
  
  // Pattern 3: Look for React Router NavLink or Link components in the rendered HTML
  // These often have href attributes added by React Router
  // The regex above should catch most of them, but let's also check for router-specific patterns
  
  return links;
}

/**
 * Compute canonical URL: strip hash, normalize trailing slash, lowercase host
 */
export function computeCanonicalUrl(url: string): string {
  try {
    const parsed = new URL(url);
    
    // Remove hash
    parsed.hash = '';
    
    // Lowercase hostname
    parsed.hostname = parsed.hostname.toLowerCase();
    
    // Normalize trailing slash: remove trailing slash unless it's root
    if (parsed.pathname !== '/' && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    
    return parsed.toString();
  } catch (error) {
    // Fallback to normalized URL if parsing fails
    return normalizeUrl(url);
  }
}


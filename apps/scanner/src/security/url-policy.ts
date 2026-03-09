import { getHostname, isSameHostname } from '../crawler/url-utils.js';
import { validateUrl } from './ssrf.js';
import { config } from '../config.js';

export interface UrlPolicyResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if URL is allowed based on policy
 */
export async function checkUrlPolicy(
  url: string,
  seedUrl?: string
): Promise<UrlPolicyResult> {
  // First, validate with SSRF protections
  try {
    await validateUrl(url, config.allowedPorts);
  } catch (error) {
    return {
      allowed: false,
      reason: error instanceof Error ? error.message : 'URL validation failed',
    };
  }

  // Same-origin policy check
  if (config.urlPolicy.sameOriginOnly && seedUrl) {
    if (!isSameHostname(url, seedUrl)) {
      // Check if origin is in allowed list
      const urlHostname = getHostname(url);
      const isAllowed = config.urlPolicy.allowedOrigins.some((allowed) => {
        try {
          const allowedHostname = getHostname(allowed);
          return urlHostname === allowedHostname;
        } catch {
          return false;
        }
      });

      if (!isAllowed) {
        return {
          allowed: false,
          reason: `URL hostname ${urlHostname} does not match seed URL origin. Same-origin policy is enabled.`,
        };
      }
    }
  }

  return { allowed: true };
}

/**
 * Check if redirect URL is safe (not to private network)
 */
export async function checkRedirectSafety(url: string): Promise<UrlPolicyResult> {
  try {
    await validateUrl(url, config.allowedPorts);
    return { allowed: true };
  } catch (error) {
    return {
      allowed: false,
      reason: `Redirect to ${url} blocked: ${error instanceof Error ? error.message : 'Invalid URL'}`,
    };
  }
}


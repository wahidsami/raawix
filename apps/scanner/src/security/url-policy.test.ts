import { describe, it, expect, beforeEach } from 'vitest';
import { checkUrlPolicy, checkRedirectSafety } from './url-policy.js';
import { config } from '../config.js';

describe('URL Policy', () => {
  beforeEach(() => {
    // Reset config to defaults
    config.urlPolicy.sameOriginOnly = false;
    config.urlPolicy.allowedOrigins = [];
  });

  describe('checkUrlPolicy', () => {
    it('should allow URL when same-origin policy is disabled', async () => {
      config.urlPolicy.sameOriginOnly = false;
      const result = await checkUrlPolicy('https://example.com');
      expect(result.allowed).toBe(true);
    });

    it('should allow same-origin URL when policy is enabled', async () => {
      config.urlPolicy.sameOriginOnly = true;
      const result = await checkUrlPolicy('https://example.com/page', 'https://example.com');
      expect(result.allowed).toBe(true);
    });

    it('should reject different origin when same-origin policy is enabled', async () => {
      config.urlPolicy.sameOriginOnly = true;
      const result = await checkUrlPolicy('https://other.com', 'https://example.com');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('does not match seed URL origin');
    });

    it('should allow URL from allowed origins list', async () => {
      config.urlPolicy.sameOriginOnly = true;
      config.urlPolicy.allowedOrigins = ['https://allowed.com'];
      const result = await checkUrlPolicy('https://allowed.com/page', 'https://example.com');
      expect(result.allowed).toBe(true);
    });

    it('should reject URL not in allowed origins', async () => {
      config.urlPolicy.sameOriginOnly = true;
      config.urlPolicy.allowedOrigins = ['https://allowed.com'];
      const result = await checkUrlPolicy('https://notallowed.com', 'https://example.com');
      expect(result.allowed).toBe(false);
    });
  });

  describe('checkRedirectSafety', () => {
    it('should allow safe redirect URL', async () => {
      const result = await checkRedirectSafety('https://example.com');
      expect(result.allowed).toBe(true);
    });

    it('should reject redirect to localhost', async () => {
      const result = await checkRedirectSafety('http://localhost');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('blocked');
    });

    it('should reject redirect to private IP', async () => {
      const result = await checkRedirectSafety('http://192.168.1.1');
      expect(result.allowed).toBe(false);
    });
  });
});


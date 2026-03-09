import { describe, it, expect } from 'vitest';
import { sanitizePattern, sanitizePatterns } from './regex-sanitizer.js';

describe('Regex Sanitizer', () => {
  describe('sanitizePattern', () => {
    it('should accept valid regex pattern', () => {
      const result = sanitizePattern('^https://example\\.com');
      expect(result.valid).toBe(true);
      expect(result.pattern).toBe('^https://example\\.com');
    });

    it('should reject pattern exceeding max length', () => {
      const longPattern = 'a'.repeat(600);
      const result = sanitizePattern(longPattern);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum length');
    });

    it('should reject invalid regex syntax', () => {
      const result = sanitizePattern('[');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should accept complex valid patterns', () => {
      const patterns = [
        '^/blog/.*',
        '.*\\.pdf$',
        'https://example\\.com/.*',
      ];

      for (const pattern of patterns) {
        const result = sanitizePattern(pattern);
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('sanitizePatterns', () => {
    it('should return valid patterns and errors separately', () => {
      const patterns = [
        '^/blog/.*',
        '[', // invalid
        '.*\\.pdf$',
      ];

      const result = sanitizePatterns(patterns);
      
      expect(result.patterns.length).toBe(2);
      expect(result.errors.length).toBe(1);
      expect(result.patterns).toContain('^/blog/.*');
      expect(result.patterns).toContain('.*\\.pdf$');
    });

    it('should handle empty array', () => {
      const result = sanitizePatterns([]);
      expect(result.patterns).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('should handle undefined', () => {
      const result = sanitizePatterns(undefined);
      expect(result.patterns).toEqual([]);
      expect(result.errors).toEqual([]);
    });
  });
});


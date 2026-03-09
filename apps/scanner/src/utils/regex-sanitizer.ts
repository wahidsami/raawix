/**
 * Sanitize and validate regex patterns
 */

const MAX_PATTERN_LENGTH = 500;

export interface SanitizedPattern {
  pattern: string;
  valid: boolean;
  error?: string;
}

/**
 * Sanitize a regex pattern
 */
export function sanitizePattern(pattern: string): SanitizedPattern {
  // Check length
  if (pattern.length > MAX_PATTERN_LENGTH) {
    return {
      pattern: '',
      valid: false,
      error: `Pattern exceeds maximum length of ${MAX_PATTERN_LENGTH} characters`,
    };
  }

  // Try to compile the regex to validate it
  try {
    new RegExp(pattern);
    return {
      pattern,
      valid: true,
    };
  } catch (error) {
    return {
      pattern: '',
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid regex pattern',
    };
  }
}

/**
 * Sanitize an array of regex patterns
 */
export function sanitizePatterns(patterns: string[] | undefined): {
  patterns: string[];
  errors: string[];
} {
  if (!patterns || patterns.length === 0) {
    return { patterns: [], errors: [] };
  }

  const validPatterns: string[] = [];
  const errors: string[] = [];

  for (const pattern of patterns) {
    const sanitized = sanitizePattern(pattern);
    if (sanitized.valid) {
      validPatterns.push(sanitized.pattern);
    } else {
      errors.push(`Pattern "${pattern.substring(0, 50)}...": ${sanitized.error}`);
    }
  }

  return { patterns: validPatterns, errors };
}


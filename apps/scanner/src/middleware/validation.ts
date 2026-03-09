import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { sanitizePatterns } from '../utils/regex-sanitizer.js';

const scanRequestSchema = z.object({
  // New format
  seedUrl: z.string().url('Invalid seedUrl format').optional(),
  maxPages: z.number().int().positive().max(config.quotas.maxPagesHardLimit).optional(),
  maxDepth: z.number().int().nonnegative().max(config.quotas.maxDepthHardLimit).optional(),
  includePatterns: z.array(z.string().max(500)).max(20).optional(),
  excludePatterns: z.array(z.string().max(500)).max(20).optional(),
  dryRun: z.boolean().optional(),
  // Entity/Property linking
  entityId: z.string().uuid('Invalid entityId format').optional(),
  propertyId: z.string().uuid('Invalid propertyId format').optional(),
  // Sequential scanning support (for phase 3: scan selected pages)
  scanId: z.string().optional(), // Allow passing existing scan ID
  selectedUrls: z.array(z.string().url('Invalid URL in selectedUrls')).optional(), // Allow passing selected URLs
  scanMode: z.enum(['domain', 'single']).optional(), // Scan mode: full domain or single page/section
  // Legacy format support
  url: z.string().url('Invalid URL format').optional(),
  options: z
    .object({
      rules: z.array(z.string()).optional(),
      timeout: z.number().int().positive().optional(),
      depth: z.number().int().nonnegative().optional(),
    })
    .optional(),
}).refine(
  (data) => data.seedUrl || data.url,
  {
    message: 'Either seedUrl or url must be provided',
    path: ['seedUrl'],
  }
);

export function validateScanRequest(req: Request, res: Response, next: NextFunction): void {
  try {
    const validated = scanRequestSchema.parse(req.body);
    
    // Sanitize regex patterns
    if (validated.includePatterns) {
      const sanitized = sanitizePatterns(validated.includePatterns);
      if (sanitized.errors.length > 0) {
        res.status(400).json({
          error: 'Invalid include patterns',
          details: sanitized.errors,
        });
        return;
      }
      validated.includePatterns = sanitized.patterns;
    }

    if (validated.excludePatterns) {
      const sanitized = sanitizePatterns(validated.excludePatterns);
      if (sanitized.errors.length > 0) {
        res.status(400).json({
          error: 'Invalid exclude patterns',
          details: sanitized.errors,
        });
        return;
      }
      validated.excludePatterns = sanitized.patterns;
    }

    req.body = validated;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
      return;
    }
    res.status(400).json({ error: 'Invalid request' });
  }
}


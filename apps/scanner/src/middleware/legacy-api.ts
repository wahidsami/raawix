import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to optionally disable legacy API endpoints
 * This is used for isolating the test environment from legacy API key exposure.
 */
export const legacyApiSwitch = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.DISABLE_LEGACY_SCAN_API === 'true') {
    return res.status(404).json({ error: 'Legacy API is disabled in this environment' });
  }
  next();
};

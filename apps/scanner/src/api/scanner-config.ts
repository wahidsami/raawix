import { Router, Request, Response } from 'express';
import { config } from '../config.js';

const router: Router = Router();

/**
 * GET /api/scanner/config
 * Returns safe scanner configuration values (for frontend validation/UX)
 * Note: This endpoint does NOT require auth - it only returns safe, non-sensitive config
 */
router.get('/scanner/config', (req: Request, res: Response) => {
  try {
    // Return only safe, non-sensitive configuration values
    // This helps the frontend provide better UX (e.g., port validation hints)
    res.json({
      allowedPorts: config.allowedPorts || [], // Empty array means all ports allowed
      allowAllPorts: config.allowedPorts === null || config.allowedPorts.length === 0, // Flag to indicate no restrictions
      allowLocalhost: config.allowLocalhost,
      maxPagesHardLimit: config.quotas.maxPagesHardLimit,
      maxDepthHardLimit: config.quotas.maxDepthHardLimit,
      // Note: We don't expose sensitive values like API keys, database URLs, etc.
    });
  } catch (error) {
    console.error('Failed to get scanner config:', error);
    res.status(500).json({ error: 'Failed to retrieve scanner configuration' });
  }
});

export default router;


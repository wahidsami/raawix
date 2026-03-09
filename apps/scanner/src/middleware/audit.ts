import type { Request, Response, NextFunction } from 'express';
import { auditLogger } from '../audit/logger.js';

/**
 * Audit logging middleware
 * Logs requests without sensitive headers
 */
export function auditLogging(req: Request, res: Response, next: NextFunction): void {
  // Log after response is sent
  res.on('finish', () => {
    auditLogger.logRequest(
      {
        method: req.method,
        path: req.path,
        ip: req.ip || req.socket.remoteAddress,
      },
      res.statusCode
    );
  });

  next();
}


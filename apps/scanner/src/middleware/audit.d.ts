import type { Request, Response, NextFunction } from 'express';
/**
 * Audit logging middleware
 * Logs requests without sensitive headers
 */
export declare function auditLogging(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=audit.d.ts.map
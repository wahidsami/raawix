import { Request, Response, NextFunction } from 'express';
/**
 * Middleware to protect routes with API key authentication
 * Checks X-API-Key header against config.apiKey
 */
export declare function apiKeyAuth(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
export interface AuthRequest extends Request {
    user?: {
        userId: string;
        email: string;
        role: string;
    };
}
/**
 * Middleware to protect routes with JWT authentication
 */
export declare function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
/**
 * Middleware to restrict route to admin role. Must be used after requireAuth.
 */
export declare function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=auth.d.ts.map
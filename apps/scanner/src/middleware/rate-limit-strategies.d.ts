import { Request, Response, NextFunction } from 'express';
/**
 * Production-ready rate limiting strategies for large-scale government portals
 */
export declare const createTieredRateLimiter: () => import("express-rate-limit").RateLimitRequestHandler[];
export declare const endpointLimiters: {
    sse: import("express-rate-limit").RateLimitRequestHandler;
    polling: import("express-rate-limit").RateLimitRequestHandler;
    heavyOperations: import("express-rate-limit").RateLimitRequestHandler;
    readOperations: import("express-rate-limit").RateLimitRequestHandler;
};
export declare const deduplicateRequests: (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export declare const createBackoffStrategy: () => {
    getDelay: (attempt: number, baseDelay?: number) => number;
};
declare class RequestQueue {
    private queue;
    private processing;
    private maxConcurrent;
    private currentConcurrent;
    add<T>(id: string, handler: () => Promise<T>): Promise<T>;
    private process;
}
export declare const requestQueue: RequestQueue;
export {};
//# sourceMappingURL=rate-limit-strategies.d.ts.map
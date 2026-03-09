import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';

/**
 * Production-ready rate limiting strategies for large-scale government portals
 */

// Strategy 1: Tiered rate limits based on user type
export const createTieredRateLimiter = () => {
  // Public/unauthenticated users: strict limits
  const publicLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Very strict for public access
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests. Please authenticate for higher limits.',
    skip: (req: Request) => {
      // Skip if user is authenticated
      return !!req.headers.authorization;
    },
  });

  // Authenticated users: higher limits
  const authenticatedLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '1000', 10), // 1000 requests per 15 min for auth users
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Rate limit exceeded. Please try again later.',
    skip: (req: Request) => {
      // Only apply to authenticated requests
      return !req.headers.authorization;
    },
  });

  return [publicLimiter, authenticatedLimiter];
};

// Strategy 2: Endpoint-specific rate limits
export const endpointLimiters = {
  // SSE endpoints: no rate limit (long-lived connections)
  sse: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10000, // Effectively unlimited for SSE
    skip: () => true, // Skip rate limiting for SSE
  }),

  // Polling endpoints: moderate limits
  polling: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute window
    max: 20, // 20 requests per minute for polling
    standardHeaders: true,
    message: 'Polling rate limit exceeded. Please reduce polling frequency.',
  }),

  // Heavy operations (scans, exports): strict limits
  heavyOperations: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: parseInt(process.env.RATE_LIMIT_SCAN_MAX || '10', 10), // 10 scans per hour
    standardHeaders: true,
    message: 'Too many scan requests. Please wait before starting another scan.',
  }),

  // Read operations: higher limits
  readOperations: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_READ_MAX || '500', 10), // 500 reads per 15 min
    standardHeaders: true,
  }),
};

// Strategy 3: Request deduplication middleware
const requestCache = new Map<string, { timestamp: number; response: any }>();
const CACHE_TTL = 2000; // 2 seconds cache for duplicate requests

export const deduplicateRequests = (req: Request, res: Response, next: NextFunction) => {
  // Only deduplicate GET requests
  if (req.method !== 'GET') {
    return next();
  }

  // Create cache key from URL + auth token
  const cacheKey = `${req.path}:${req.headers.authorization || 'public'}`;
  const cached = requestCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    // Return cached response
    return res.json(cached.response);
  }

  // Store original json method
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    // Cache successful responses
    if (res.statusCode === 200) {
      requestCache.set(cacheKey, {
        timestamp: Date.now(),
        response: body,
      });
    }
    return originalJson(body);
  };

  // Clean up old cache entries periodically
  if (requestCache.size > 1000) {
    const now = Date.now();
    for (const [key, value] of requestCache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        requestCache.delete(key);
      }
    }
  }

  next();
};

// Strategy 4: Exponential backoff helper for client-side
export const createBackoffStrategy = () => {
  return {
    getDelay: (attempt: number, baseDelay: number = 1000) => {
      // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
      const delay = Math.min(baseDelay * Math.pow(2, attempt), 30000);
      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.3 * delay;
      return delay + jitter;
    },
  };
};

// Strategy 5: Request queue for heavy operations
interface QueuedRequest {
  id: string;
  timestamp: number;
  handler: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

class RequestQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private maxConcurrent = parseInt(process.env.MAX_CONCURRENT_REQUESTS || '5', 10);
  private currentConcurrent = 0;

  async add<T>(id: string, handler: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        id,
        timestamp: Date.now(),
        handler,
        resolve,
        reject,
      });
      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;
    if (this.currentConcurrent >= this.maxConcurrent) return;

    this.processing = true;

    while (this.queue.length > 0 && this.currentConcurrent < this.maxConcurrent) {
      const request = this.queue.shift();
      if (!request) break;

      this.currentConcurrent++;
      request
        .handler()
        .then(request.resolve)
        .catch(request.reject)
        .finally(() => {
          this.currentConcurrent--;
          this.process();
        });
    }

    this.processing = false;
  }
}

export const requestQueue = new RequestQueue();


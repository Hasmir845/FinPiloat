import { Request, Response, NextFunction } from 'express';
import { ApiErrorResponse } from '../types';

export interface RateLimiterOptions {
  /** Window size in milliseconds (e.g. 60_000 for 1 minute) */
  windowMs: number;
  /** Maximum allowed requests within the windowMs */
  maxRequests: number;
  /** Custom error message returned when limit is exceeded */
  message?: string;
  /** Custom key generator (defaults to client IP / x-forwarded-for) */
  keyGenerator?: (req: Request) => string;
  /** Optional skip condition */
  skip?: (req: Request) => boolean;
}

interface ClientBucket {
  count: number;
  resetTime: number;
}

/**
 * Lightweight, zero-dependency in-memory sliding window rate limiter.
 * Protects against brute force, denial-of-service, and LLM quota exhaustion.
 */
export class MemoryRateLimiter {
  private buckets = new Map<string, ClientBucket>();
  private readonly options: Required<RateLimiterOptions>;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(options: RateLimiterOptions) {
    this.options = {
      windowMs: options.windowMs,
      maxRequests: options.maxRequests,
      message: options.message || 'Too many requests. Please try again later.',
      keyGenerator:
        options.keyGenerator ||
        ((req: Request): string => {
          const forwarded = req.headers['x-forwarded-for'];
          if (typeof forwarded === 'string') {
            return forwarded.split(',')[0].trim();
          }
          return req.ip || req.socket.remoteAddress || '127.0.0.1';
        }),
      skip: options.skip || (() => false),
    };

    // Periodically clean up expired buckets to prevent memory accumulation
    const cleanupMs = Math.max(60_000, this.options.windowMs * 2);
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupMs);

    // Unref timer so it does not keep Node.js event loop alive in test runs
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, bucket] of this.buckets.entries()) {
      if (now > bucket.resetTime) {
        this.buckets.delete(key);
      }
    }
  }

  /**
   * Resets all tracked rate limit records (useful for testing).
   */
  public reset(): void {
    this.buckets.clear();
  }

  /**
   * Stops background cleanup timer and clears records.
   */
  public stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.buckets.clear();
  }

  /**
   * Express middleware handler.
   */
  public middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (this.options.skip(req)) {
        return next();
      }

      const key = this.options.keyGenerator(req);
      const now = Date.now();
      let bucket = this.buckets.get(key);

      if (!bucket || now > bucket.resetTime) {
        bucket = {
          count: 1,
          resetTime: now + this.options.windowMs,
        };
        this.buckets.set(key, bucket);
      } else {
        bucket.count++;
      }

      const remaining = Math.max(0, this.options.maxRequests - bucket.count);
      const resetSeconds = Math.max(1, Math.ceil((bucket.resetTime - now) / 1000));

      // Standard rate limit response headers
      res.setHeader('X-RateLimit-Limit', this.options.maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(bucket.resetTime / 1000));

      if (bucket.count > this.options.maxRequests) {
        res.setHeader('Retry-After', resetSeconds);
        const errorResponse: ApiErrorResponse = {
          success: false,
          error: {
            message: this.options.message,
            statusCode: 429,
          },
        };
        res.status(429).json(errorResponse);
        return;
      }

      next();
    };
  }
}

// Global API rate limiter: 120 requests per minute per IP
export const apiRateLimiterInstance = new MemoryRateLimiter({
  windowMs: 60_000,
  maxRequests: 120,
  message: 'API rate limit exceeded. Maximum 120 requests per minute allowed.',
});

// Dedicated AI and expensive calculation rate limiter: 20 requests per minute per IP
export const aiRateLimiterInstance = new MemoryRateLimiter({
  windowMs: 60_000,
  maxRequests: 20,
  message: 'AI Copilot request limit exceeded. Maximum 20 AI interactions per minute allowed to protect API quota.',
});

export const apiRateLimiter = apiRateLimiterInstance.middleware();
export const aiRateLimiter = aiRateLimiterInstance.middleware();

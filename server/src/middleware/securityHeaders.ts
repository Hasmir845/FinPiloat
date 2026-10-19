import { Request, Response, NextFunction } from 'express';

/**
 * Security headers middleware enforcing OWASP defensive headers
 * without requiring external heavyweight dependencies.
 */
export const securityHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent framing / clickjacking attacks
  res.setHeader('X-Frame-Options', 'DENY');

  // Legacy cross-site scripting filter protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Control referrer information leakage
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Prevent caching of sensitive API responses by intermediary proxies
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Strict Transport Security (HSTS) in production environments
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
};

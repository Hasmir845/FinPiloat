import express, { Application } from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { securityHeaders } from './middleware/securityHeaders';
import { apiRateLimiter } from './middleware/rateLimiter';

export const createApp = (): Application => {
  const app = express();

  // Hide server fingerprinting header
  app.disable('x-powered-by');

  // Defensive HTTP headers (OWASP best practice)
  app.use(securityHeaders);

  // Allowed frontend origins from environment (supports CLIENT_ORIGIN and CLIENT_URL) and dev loopbacks
  const rawEnvOrigins = [
    ...(process.env.CLIENT_ORIGIN || '').split(','),
    ...(process.env.CLIENT_URL || '').split(','),
  ];

  const envOrigins = rawEnvOrigins
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const defaultDevOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
  ];

  const allowedOriginsSet = new Set(
    process.env.NODE_ENV === 'production'
      ? envOrigins
      : [...defaultDevOrigins, ...envOrigins]
  );

  // Regex to recognize any local loopback development origin (disabled in production)
  const isLocalDevOrigin = (origin: string): boolean => {
    if (process.env.NODE_ENV === 'production') {
      return false;
    }
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  };

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);

        // Allow wildcard if explicitly configured
        if (allowedOriginsSet.has('*')) {
          return callback(null, true);
        }

        const normalizedOrigin = origin.replace(/\/+$/, '');

        // Allow explicitly defined origins or local development origins
        if (allowedOriginsSet.has(normalizedOrigin) || isLocalDevOrigin(normalizedOrigin)) {
          return callback(null, true);
        }

        // Clean rejection without crashing Express with 500 error
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    })
  );

  // Body parser middleware with strict payload size limit (mitigates memory exhaustion DoS)
  app.use(express.json({ limit: '200kb' }));
  app.use(express.urlencoded({ extended: true, limit: '200kb' }));

  // Fast 204 handler for browser favicon requests (avoids 404/504 overhead)
  app.get('/favicon.ico', (_req, res) => {
    res.status(204).end();
  });

  // Root status endpoint (fast, zero external dependencies, no database/AI dependencies)
  app.get('/', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'FinPilot AI Backend API',
      version: '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/api/health',
        transactions: '/api/transactions',
        financial: '/api/financial/summary',
        copilot: '/api/copilot/status',
        financing: '/api/financing/readiness',
      },
    });
  });

  // Global rate limiter on all API endpoints
  app.use('/api', apiRateLimiter);

  // API base route
  app.use('/api', routes);

  // 404 handler for unknown routes
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
};

// Pre-instantiated app for serverless export
export const app = createApp();
export default app;

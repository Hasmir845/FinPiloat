import express, { Application } from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

export const createApp = (): Application => {
  const app = express();

  // Allowed frontend origins from environment and local dev loopbacks
  const envOrigins = (process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const defaultDevOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
  ];

  const allowedOriginsSet = new Set([...defaultDevOrigins, ...envOrigins]);

  // Regex to recognize any local loopback development origin (e.g. localhost:5174)
  const isLocalDevOrigin = (origin: string): boolean => {
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  };

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);

        // Allow wildcard if configured
        if (allowedOriginsSet.has('*')) {
          return callback(null, true);
        }

        // Allow explicitly defined origins or local development origins
        if (allowedOriginsSet.has(origin) || isLocalDevOrigin(origin)) {
          return callback(null, true);
        }

        // Clean rejection without crashing Express with 500 error
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // Body parser middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API base route
  app.use('/api', routes);

  // 404 handler for unknown routes
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
};

export default createApp;

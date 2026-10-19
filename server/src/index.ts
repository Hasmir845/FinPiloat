import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import {
  connectDatabase,
  disconnectDatabase,
  isDatabaseConnected,
  getDatabaseName,
} from './db/connection';
import { transactionRepository } from './repositories/transactionRepository';

const PORT = process.env.PORT || 5001;
const app = createApp();

async function startServer(): Promise<void> {
  const uri = process.env.MONGODB_URI;

  if (uri && uri.trim().length > 0) {
    console.log('[FinPilot Server] Connecting to MongoDB Atlas cluster...');
    try {
      await connectDatabase();
      const dbName = getDatabaseName();
      console.log(`[FinPilot Server] MongoDB Atlas connected successfully to database: '${dbName}'`);

      // Initialize indexes and seed records if database collection is empty
      try {
        await transactionRepository.seedIfEmpty();
      } catch (seedError) {
        console.warn(
          '[FinPilot Server] Warning during initial seed check:',
          seedError instanceof Error ? seedError.message : seedError
        );
      }
    } catch (dbError) {
      const safeMessage = dbError instanceof Error ? dbError.message : 'Unknown connection error';
      console.error(`[FinPilot Server] Database connection could not be established: ${safeMessage}`);
      console.warn('[FinPilot Server] Starting in degraded mode (database-backed endpoints will return 503).');
    }
  } else {
    console.warn('[FinPilot Server] MONGODB_URI is not set in environment variables.');
    console.warn('[FinPilot Server] Starting in degraded mode (database-backed endpoints will return 503 until configured).');
  }

  const server = app.listen(PORT, () => {
    console.log(`[FinPilot Server] Running at http://localhost:${PORT}`);
    console.log(`[FinPilot Server] Health check available at http://localhost:${PORT}/api/health`);
    console.log(`[FinPilot Server] Allowed client origin: ${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}`);
    console.log(
      `[FinPilot Server] Database status: ${
        isDatabaseConnected() ? 'CONNECTED & READY' : 'DISCONNECTED (NOT READY)'
      }`
    );
  });

  const handleShutdown = (signal: string): void => {
    console.log(`[FinPilot Server] ${signal} signal received. Closing HTTP server and active connections...`);
    server.close(async () => {
      console.log('[FinPilot Server] HTTP server closed.');
      try {
        await disconnectDatabase();
        console.log('[FinPilot Server] MongoDB connection closed cleanly.');
      } catch (disconnectErr) {
        console.error('[FinPilot Server] Error while disconnecting MongoDB:', disconnectErr);
      }
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

startServer().catch((fatalError) => {
  console.error('[FinPilot Server] Fatal server startup error:', fatalError);
  process.exit(1);
});

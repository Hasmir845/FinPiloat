import { HealthCheckResponse } from '../types';
import { isDatabaseConnected, getConnectionStatus } from '../db/connection';

export class HealthService {
  private startTime: number = Date.now();

  public getHealthStatus(): HealthCheckResponse {
    const isDbConnected = isDatabaseConnected();
    const conn = getConnectionStatus();

    // Server is 'ok' if database is connected; 'degraded' if database connection is not active
    const status = isDbConnected ? 'ok' : 'degraded';

    return {
      status,
      service: 'finpilot-server',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: isDbConnected ? 'connected' : conn.state === 'error' ? 'error' : 'disconnected',
        databaseName: isDbConnected ? conn.dbName : undefined,
        configured: conn.configured,
        message:
          conn.message ||
          (isDbConnected
            ? 'Connected to MongoDB Atlas'
            : conn.configured
            ? 'Database connection is not established'
            : 'MONGODB_URI is not configured in environment variables'),
      },
    };
  }
}

export const healthService = new HealthService();

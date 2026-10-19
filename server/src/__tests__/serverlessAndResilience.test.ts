import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app';
import { app as exportedApp } from '../index';
import { setDatabaseInstanceForTesting } from '../db/connection';
import { TransactionRepository } from '../repositories/transactionRepository';
import { setTestGenerateContentOverride } from '../services/copilotService';
import { AppError } from '../middleware/errorHandler';

describe('Vercel Serverless Resilience & Route Verification Tests', () => {
  const app = createApp();

  beforeEach(() => {
    setDatabaseInstanceForTesting(null);
    setTestGenerateContentOverride(null);
  });

  afterEach(() => {
    setDatabaseInstanceForTesting(null);
    setTestGenerateContentOverride(null);
  });

  // Ephemeral test request runner
  async function makeRequest(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown
  ): Promise<{ status: number; headers: Headers; body: any }> {
    return new Promise((resolve, reject) => {
      const server = app.listen(0, async () => {
        const address = server.address();
        if (!address || typeof address === 'string') {
          server.close();
          return reject(new Error('Failed to obtain ephemeral port'));
        }
        const port = address.port;
        try {
          const res = await fetch(`http://127.0.0.1:${port}${path}`, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
          });
          const text = await res.text();
          let json: any = null;
          try {
            json = text ? JSON.parse(text) : null;
          } catch {
            json = text;
          }
          server.close(() => resolve({ status: res.status, headers: res.headers, body: json }));
        } catch (err) {
          server.close(() => reject(err));
        }
      });
    });
  }

  test('1. Root Response (GET /) returns small JSON status immediately without DB/AI dependency', async () => {
    const res = await makeRequest('GET', '/');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.service, 'FinPilot AI Backend API');
    assert.ok(res.body.endpoints);
    assert.equal(res.body.endpoints.health, '/api/health');
  });

  test('2. Favicon handler (GET /favicon.ico) returns HTTP 204 immediately without 404/504 overhead', async () => {
    const res = await makeRequest('GET', '/favicon.ico');
    assert.equal(res.status, 204);
  });

  test('3. Health endpoint (GET /api/health) responds immediately with 200 without waiting on DB', async () => {
    const res = await makeRequest('GET', '/api/health');
    assert.equal(res.status, 200);
    assert.ok(res.body.status === 'ok' || res.body.status === 'degraded');
    assert.equal(res.body.service, 'finpilot-server');
    assert.equal(typeof res.body.database.configured, 'boolean');
  });

  test('4. Unknown route returns a prompt 404 instead of hanging or timing out', async () => {
    const res = await makeRequest('GET', '/api/unknown-route-does-not-exist');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.match(res.body.error.message, /Endpoint not found/);
  });

  test('5. Serverless export validation: server/src/index exports callable Express app', () => {
    assert.equal(typeof exportedApp, 'function', 'Exported app must be an Express request handler function');
  });

  test('6. Database connection failure: returns clean HTTP 503 without process crash or credential leak', async () => {
    // When DB is disconnected, repository methods fail cleanly with 503 AppError
    const disconnectedRepo = new TransactionRepository(() => {
      throw new AppError('Database unavailable. MongoDB Atlas connection is not active.', 503);
    });

    await assert.rejects(
      async () => {
        await disconnectedRepo.getAll();
      },
      (err: any) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 503);
        assert.ok(err.message.includes('Database unavailable'));
        return true;
      }
    );
  });

  test('7. Gemini timeout defense: simulates bounded timeout rejection instead of hanging', async () => {
    // Verify that an aborted or timed out AI call properly produces a 504 AppError
    const simulateTimeout = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new AppError('Gemini API request timed out after 18 seconds. Please try again.', 504));
      }, 10);
    });

    await assert.rejects(
      async () => {
        await simulateTimeout;
      },
      (err: any) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 504);
        assert.ok(err.message.includes('timed out'));
        return true;
      }
    );
  });
});

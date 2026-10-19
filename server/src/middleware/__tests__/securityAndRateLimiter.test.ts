import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../app';
import { MemoryRateLimiter, apiRateLimiterInstance, aiRateLimiterInstance } from '../rateLimiter';
import { setDatabaseInstanceForTesting } from '../../db/connection';
import { Transaction } from '../../types';

describe('Security Hardening & Rate Limiting Integration Tests', () => {
  const app = createApp();

  const sampleTx: Transaction[] = [
    {
      id: 'tx-sec-01',
      date: '2026-10-15',
      description: 'Security Audit Inflow',
      type: 'income',
      category: 'Revenue / Sales',
      amount: 15000,
      status: 'paid',
      createdAt: '2026-10-15T10:00:00.000Z',
      updatedAt: '2026-10-15T10:00:00.000Z',
    },
  ];

  const mockDb = {
    collection: () => ({
      find: () => ({
        sort: () => ({
          toArray: async () => sampleTx,
        }),
      }),
      findOne: async (q: any) => sampleTx.find((t) => t.id === q.id) || null,
      countDocuments: async () => sampleTx.length,
    }),
  } as unknown as Parameters<typeof setDatabaseInstanceForTesting>[0];

  beforeEach(() => {
    setDatabaseInstanceForTesting(mockDb);
    apiRateLimiterInstance.reset();
    aiRateLimiterInstance.reset();
  });

  afterEach(() => {
    apiRateLimiterInstance.reset();
    aiRateLimiterInstance.reset();
  });

  // Helper to send in-process HTTP requests to the Express app
  async function makeRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
    headers: Record<string, string> = {}
  ): Promise<{ status: number; headers: Headers; body: any }> {
    return new Promise((resolve, reject) => {
      const server = app.listen(0, async () => {
        const address = server.address();
        if (!address || typeof address === 'string') {
          server.close();
          return reject(new Error('Failed to bind ephemeral test server'));
        }
        const port = address.port;
        try {
          const res = await fetch(`http://127.0.0.1:${port}${path}`, {
            method,
            headers: {
              'Content-Type': 'application/json',
              ...headers,
            },
            body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
          });
          const json = await res.json().catch(() => null);
          server.close(() => resolve({ status: res.status, headers: res.headers, body: json }));
        } catch (err) {
          server.close(() => reject(err));
        }
      });
    });
  }

  test('1. Security Headers: Enforces OWASP defensive headers and strips X-Powered-By', async () => {
    const res = await makeRequest('GET', '/api/health');
    assert.equal(res.status, 200);

    // Verify defensive headers
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.equal(res.headers.get('x-xss-protection'), '1; mode=block');
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.ok(res.headers.get('cache-control')?.includes('no-store'));

    // Verify X-Powered-By is suppressed
    assert.equal(res.headers.get('x-powered-by'), null);
  });

  test('2. Rate Limiting: MemoryRateLimiter enforces thresholds and returns HTTP 429 with headers', async () => {
    const limiter = new MemoryRateLimiter({
      windowMs: 5000,
      maxRequests: 3,
      message: 'Rate limit test exceeded',
    });

    const mockReq = {
      headers: {},
      ip: '192.168.1.100',
      socket: { remoteAddress: '192.168.1.100' },
    } as any;

    let lastStatus = 200;
    let lastBody: any = null;
    let headersSet: Record<string, any> = {};

    const mockRes = {
      setHeader: (name: string, value: any) => {
        headersSet[name.toLowerCase()] = value;
      },
      status: (code: number) => {
        lastStatus = code;
        return {
          json: (b: any) => {
            lastBody = b;
          },
        };
      },
    } as any;

    const nextFn = () => {
      lastStatus = 200;
    };

    const mw = limiter.middleware();

    // Requests 1, 2, 3 must pass
    mw(mockReq, mockRes, nextFn);
    assert.equal(lastStatus, 200);
    assert.equal(headersSet['x-ratelimit-remaining'], 2);

    mw(mockReq, mockRes, nextFn);
    assert.equal(lastStatus, 200);
    assert.equal(headersSet['x-ratelimit-remaining'], 1);

    mw(mockReq, mockRes, nextFn);
    assert.equal(lastStatus, 200);
    assert.equal(headersSet['x-ratelimit-remaining'], 0);

    // Request 4 must be rejected with HTTP 429
    mw(mockReq, mockRes, nextFn);
    assert.equal(lastStatus, 429);
    assert.equal(lastBody.success, false);
    assert.equal(lastBody.error.statusCode, 429);
    assert.match(lastBody.error.message, /Rate limit test exceeded/);
    assert.ok(headersSet['retry-after'] >= 1);

    limiter.stop();
  });

  test('3. Body Payload Size Limit: Rejects payloads exceeding 200kb with HTTP 413', async () => {
    // Generate a payload exceeding 200kb
    const oversizedPayload = {
      data: 'X'.repeat(250 * 1024), // 250KB
    };

    const res = await makeRequest('POST', '/api/transactions', oversizedPayload);
    // Express body-parser returns 413 Payload Too Large
    assert.equal(res.status, 413);
  });

  test('4. ID Parameter Validation: Rejects malformed or unsafe transaction IDs with HTTP 400', async () => {
    // Path traversal / SQL injection attempt in ID
    const unsafeId = '..%2F..%2Fetc%2Fpasswd';
    const res = await makeRequest('GET', `/api/transactions/${unsafeId}`);
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.error.message, /Invalid transaction ID format/);

    // Overly long ID string attempt
    const longId = 'a'.repeat(100);
    const res2 = await makeRequest('GET', `/api/transactions/${longId}`);
    assert.equal(res2.status, 400);
    assert.match(res2.body.error.message, /Invalid transaction ID format/);
  });

  test('5. Update Validation: Rejects empty update payload with HTTP 400', async () => {
    const res = await makeRequest('PUT', '/api/transactions/tx-sec-01', {});
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.error.message, /At least one field must be provided/);
  });
});

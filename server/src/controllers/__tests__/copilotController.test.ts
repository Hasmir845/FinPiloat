import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../app';
import { setDatabaseInstanceForTesting } from '../../db/connection';
import { setTestGenerateContentOverride } from '../../services/copilotService';
import { Transaction } from '../../types';

describe('Copilot HTTP Controller & Endpoint Integration Tests', () => {
  const app = createApp();
  const originalApiKey = process.env.GEMINI_API_KEY;

  const sampleTx: Transaction[] = [
    {
      id: 'tx-100',
      date: '2026-05-01',
      description: 'Customer Payment',
      type: 'income',
      category: 'Revenue / Sales',
      amount: 50000,
      status: 'paid',
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
    },
  ];

  const mockDb = {
    collection: () => ({
      find: () => ({
        sort: () => ({
          toArray: async () => sampleTx,
        }),
      }),
      countDocuments: async () => sampleTx.length,
    }),
  } as unknown as Parameters<typeof setDatabaseInstanceForTesting>[0];

  beforeEach(() => {
    setDatabaseInstanceForTesting(mockDb);
    setTestGenerateContentOverride(null);
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalApiKey;
    setTestGenerateContentOverride(null);
  });

  // Helper to make lightweight local in-process requests to the Express app
  async function makeRequest(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown
  ): Promise<{ status: number; body: any }> {
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
          const json = await res.json().catch(() => null);
          server.close(() => resolve({ status: res.status, body: json }));
        } catch (err) {
          server.close(() => reject(err));
        }
      });
    });
  }

  test('GET /api/copilot/status returns configuration and workspace info', async () => {
    delete process.env.GEMINI_API_KEY;
    const res = await makeRequest('GET', '/api/copilot/status');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.configured, false);
    assert.equal(res.body.data.workspace, 'Apex Supply Chain Co.');
    assert.equal(res.body.data.isSingleWorkspaceDemo, true);

    process.env.GEMINI_API_KEY = 'valid-test-key';
    const res2 = await makeRequest('GET', '/api/copilot/status');
    assert.equal(res2.status, 200);
    assert.equal(res2.body.data.configured, true);
  });

  test('POST /api/copilot/chat rejects empty or invalid message with HTTP 400', async () => {
    process.env.GEMINI_API_KEY = 'valid-test-key';
    const res = await makeRequest('POST', '/api/copilot/chat', { message: '   ' });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.error.message, /empty/i);
  });

  test('POST /api/copilot/chat successfully generates grounded response when API key is present', async () => {
    process.env.GEMINI_API_KEY = 'valid-test-key';
    setTestGenerateContentOverride(async () => ({
      text: 'Based on your authoritative records, your current operating cash is $150,000.00.',
    }));

    const res = await makeRequest('POST', '/api/copilot/chat', {
      message: 'What is our current cash balance?',
      openingBalance: 100000,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.match(res.body.data.message, /\$150,000\.00/);
    assert.equal(res.body.data.groundingContext.currentCashBalance, 150000);
    assert.equal(res.body.data.groundingContext.workspaceName, 'Apex Supply Chain Co.');
    assert(Array.isArray(res.body.data.confidenceLimitations));
  });

  test('POST /api/copilot/chat returns HTTP 503 when API key is missing', async () => {
    delete process.env.GEMINI_API_KEY;
    const res = await makeRequest('POST', '/api/copilot/chat', {
      message: 'What is our runway?',
    });

    assert.equal(res.status, 503);
    assert.equal(res.body.success, false);
    assert.match(res.body.error.message, /GEMINI_API_KEY/i);
  });
});

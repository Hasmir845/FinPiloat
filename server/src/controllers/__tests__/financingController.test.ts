import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../app';
import { setDatabaseInstanceForTesting } from '../../db/connection';
import { setTestNarrativeOverride } from '../../services/financingService';
import { Transaction } from '../../types';

describe('Financing HTTP Controller & Endpoints Integration Tests', () => {
  const app = createApp();

  const sampleTransactions: Transaction[] = [
    {
      id: 'tx-fin-1',
      date: '2026-04-01',
      description: 'Consulting Retainer Client A',
      type: 'income',
      category: 'Revenue / Sales',
      amount: 45000,
      status: 'paid',
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z',
    },
    {
      id: 'tx-fin-2',
      date: '2026-04-15',
      description: 'Office Lease & Facilities',
      type: 'expense',
      category: 'Rent & Facilities',
      amount: 8000,
      status: 'paid',
      createdAt: '2026-04-15T00:00:00.000Z',
      updatedAt: '2026-04-15T00:00:00.000Z',
    },
    {
      id: 'tx-fin-3',
      date: '2026-05-01',
      description: 'Consulting Retainer Client B',
      type: 'income',
      category: 'Revenue / Sales',
      amount: 40000,
      status: 'paid',
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
    },
    {
      id: 'tx-fin-4',
      date: '2026-05-20',
      description: 'Client Unpaid Invoice',
      type: 'income',
      category: 'Accounts Receivable',
      amount: 25000,
      status: 'pending',
      createdAt: '2026-05-20T00:00:00.000Z',
      updatedAt: '2026-05-20T00:00:00.000Z',
    },
  ];

  const mockDb = {
    collection: () => ({
      find: () => ({
        sort: () => ({
          toArray: async () => sampleTransactions,
        }),
      }),
      countDocuments: async () => sampleTransactions.length,
    }),
  } as unknown as Parameters<typeof setDatabaseInstanceForTesting>[0];

  beforeEach(() => {
    setDatabaseInstanceForTesting(mockDb);
    setTestNarrativeOverride(null);
  });

  afterEach(() => {
    setTestNarrativeOverride(null);
  });

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

  test('GET /api/financing/readiness returns initial readiness indicators from database', async () => {
    const res = await makeRequest('GET', '/api/financing/readiness?openingBalance=10000');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(typeof res.body.data.currentCashBalance, 'number');
    assert.equal(res.body.data.currentCashBalance, 87000); // 10000 + 45000 - 8000 + 40000
    assert.equal(res.body.data.pendingReceivables, 25000);
    assert.equal(res.body.data.isOpeningBalanceConfigured, true);
    assert(Array.isArray(res.body.data.missingInformationChecklist));
  });

  test('POST /api/financing/assess validates schema and rejects invalid requested amount with HTTP 400', async () => {
    const invalidPayload = {
      businessType: 'Limited Liability Company (LLC)',
      industry: 'Technology',
      operatingMonths: 24,
      requestedAmount: -5000, // Invalid: negative
      purpose: 'working_capital',
      preferredRepaymentMonths: 12,
    };

    const res = await makeRequest('POST', '/api/financing/assess', invalidPayload);
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.error.message, /greater than 0/i);
  });

  test('POST /api/financing/assess validates required business operating duration', async () => {
    const invalidPayload = {
      businessType: 'Corporation (C-Corp / S-Corp)',
      industry: 'Manufacturing',
      operatingMonths: -2, // Invalid
      requestedAmount: 50000,
      purpose: 'equipment_purchase',
      preferredRepaymentMonths: 24,
    };

    const res = await makeRequest('POST', '/api/financing/assess', invalidPayload);
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.error.message, /operating/i);
  });

  test('POST /api/financing/assess successfully executes readiness and returns ranked recommendations', async () => {
    setTestNarrativeOverride(
      'Audit Summary: Business shows positive operational cash flow with notable invoice backlog. Factoring and line of credit are well-suited.'
    );

    const validPayload = {
      businessType: 'Limited Liability Company (LLC)',
      industry: 'Wholesale Trade',
      operatingMonths: 36,
      requestedAmount: 20000,
      purpose: 'invoice_bridge',
      preferredRepaymentMonths: 6,
      statedMonthlyRevenue: 40000,
      existingMonthlyDebtRepayment: 0,
      openingBalance: 15000,
    };

    const res = await makeRequest('POST', '/api/financing/assess', validPayload);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const data = res.body.data;
    assert(data.readiness);
    assert.equal(data.userInput.businessType, 'Limited Liability Company (LLC)');
    assert.equal(data.userInput.operatingMonths, 36);
    assert.equal(data.userInput.requestedAmount, 20000);
    assert.equal(data.userInput.purpose, 'invoice_bridge');

    // Recommendations verification
    assert(Array.isArray(data.matchedOptions));
    assert(data.matchedOptions.length > 0);
    // For invoice_bridge, invoice factoring should be highest match
    assert.equal(data.matchedOptions[0].type, 'invoice_factoring');
    assert.equal(data.matchedOptions[0].matchLevel, 'strong_match');
    assert.equal(data.matchedOptions[0].isIllustrative, true);

    // Narrative and disclaimers verification
    assert.match(data.aiExplanation, /Audit Summary/);
    assert(Array.isArray(data.disclaimers));
    assert(data.disclaimers.length >= 2);
  });
});

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { TransactionRepository } from '../../repositories/transactionRepository';
import { setDatabaseInstanceForTesting } from '../../db/connection';
import {
  buildFinancialSummary,
  DEFAULT_OPENING_BALANCE,
} from '../financialCalculationService';
import { generateCashFlowForecast } from '../forecastingService';
import { analyzeFinancialRisks } from '../riskAnalysisService';
import { CreateTransactionInput, UpdateTransactionInput } from '../../types';

/**
 * Isolated in-memory MongoDB-compatible collection for end-to-end integration testing.
 * Simulates real MongoDB document persistence across backend restarts without modifying real data.
 */
class IsolatedTestMongoCollection {
  private docs: any[] = [];

  constructor(initialDocs: any[] = []) {
    this.docs = JSON.parse(JSON.stringify(initialDocs));
  }

  public getRawDocs(): any[] {
    return this.docs;
  }

  public setDocs(docs: any[]): void {
    this.docs = JSON.parse(JSON.stringify(docs));
  }

  public async countDocuments(): Promise<number> {
    return this.docs.length;
  }

  public async createIndex(): Promise<string> {
    return 'mock_index';
  }

  public find(query: any = {}) {
    let result = [...this.docs];

    if (query.type) result = result.filter((d) => d.type === query.type);
    if (query.status) result = result.filter((d) => d.status === query.status);
    if (query.category) result = result.filter((d) => d.category === query.category);

    return {
      sort: (sortOptions: any) => {
        const [field, order] = Object.entries(sortOptions)[0] || ['date', -1];
        result.sort((a, b) => {
          const cmp = (a[field] ?? '').toString().localeCompare((b[field] ?? '').toString());
          return order === 1 ? cmp : -cmp;
        });
        return {
          toArray: async () => JSON.parse(JSON.stringify(result)),
        };
      },
      toArray: async () => JSON.parse(JSON.stringify(result)),
    };
  }

  public async findOne(query: any): Promise<any | null> {
    const doc = this.docs.find((d) => {
      if (query.id !== undefined && d.id !== query.id) return false;
      if (query._id !== undefined && d._id !== query._id) return false;
      return true;
    });
    return doc ? JSON.parse(JSON.stringify(doc)) : null;
  }

  public async insertOne(doc: any): Promise<any> {
    const clone = JSON.parse(JSON.stringify(doc));
    this.docs.push(clone);
    return { acknowledged: true, insertedId: clone._id || clone.id };
  }

  public async insertMany(docs: any[]): Promise<any> {
    const clones = JSON.parse(JSON.stringify(docs));
    this.docs.push(...clones);
    return { acknowledged: true, insertedCount: clones.length };
  }

  public async updateOne(query: any, update: any): Promise<any> {
    const index = this.docs.findIndex((d) => d.id === query.id);
    if (index === -1) return { matchedCount: 0, modifiedCount: 0 };
    const existing = this.docs[index];
    this.docs[index] = {
      ...existing,
      ...(update.$set || {}),
      updatedAt: update.$set?.updatedAt || new Date().toISOString(),
    };
    return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
  }

  public async findOneAndUpdate(query: any, update: any, _options?: any): Promise<any> {
    const index = this.docs.findIndex((d) => d.id === query.id);
    if (index === -1) return null;
    const existing = this.docs[index];
    const updated = {
      ...existing,
      ...(update.$set || {}),
      updatedAt: update.$set?.updatedAt || new Date().toISOString(),
    };
    this.docs[index] = updated;
    return JSON.parse(JSON.stringify(updated));
  }

  public async deleteOne(query: any): Promise<any> {
    const index = this.docs.findIndex((d) => d.id === query.id);
    if (index === -1) return { acknowledged: true, deletedCount: 0 };
    this.docs.splice(index, 1);
    return { acknowledged: true, deletedCount: 1 };
  }

  public async deleteMany(_query: any): Promise<any> {
    const count = this.docs.length;
    this.docs = [];
    return { deletedCount: count };
  }
}

describe('Step 8: End-to-End Financial Workflow Integration Tests', () => {
  let isolatedStorage: IsolatedTestMongoCollection;
  let mockDb: any;
  let repo: TransactionRepository;
  const OPENING_BALANCE = 100_000;
  const ANCHOR_DATE = '2026-06-30';

  beforeEach(() => {
    // Start each test run with clean isolated test storage
    isolatedStorage = new IsolatedTestMongoCollection([]);
    mockDb = {
      collection: (_name: string) => isolatedStorage,
      admin: () => ({ ping: async () => ({ ok: 1 }) }),
      databaseName: 'finpilot_test_isolated',
    };
    setDatabaseInstanceForTesting(mockDb);
    repo = new TransactionRepository(() => mockDb as any);
  });

  test('1. Create an income transaction and confirm persistence in MongoDB', async () => {
    const newIncome: CreateTransactionInput = {
      date: '2026-06-01',
      description: 'Enterprise Client Invoice #901',
      type: 'income',
      category: 'Revenue / Sales',
      amount: 50000,
      counterparty: 'Acme Global Corp',
      status: 'paid',
    };

    const created = await repo.create(newIncome);
    assert.ok(created.id, 'Transaction ID must be assigned');
    assert.equal(created.amount, 50000);
    assert.equal(created.type, 'income');
    assert.equal(created.status, 'paid');

    // Confirm direct persistence in database storage
    const rawDocs = isolatedStorage.getRawDocs();
    assert.equal(rawDocs.length, 1);
    assert.equal(rawDocs[0].id, created.id);
    assert.equal(rawDocs[0].amount, 50000);
  });

  test('2. Confirm dashboard and cash-flow metrics update accurately after income transaction', async () => {
    await repo.create({
      date: '2026-06-01',
      description: 'Distribution Revenue',
      type: 'income',
      category: 'Revenue / Sales',
      amount: 50000,
      status: 'paid',
    });

    const txs = await repo.getAll();
    const summary = buildFinancialSummary(txs, OPENING_BALANCE, ANCHOR_DATE);

    assert.equal(summary.totalPaidIncome, 50000, 'Paid income must equal $50,000');
    assert.equal(summary.totalPaidExpenses, 0, 'Paid expenses must equal $0');
    assert.equal(summary.netCashFlow, 50000, 'Net cash flow must equal $50,000');
    assert.equal(summary.currentCashBalance, 150000, 'Operating cash must be $100k opening + $50k income = $150,000');
  });

  test('3. Create an expense transaction and verify net cash flow and operating cash calculations', async () => {
    // Income: $50,000
    await repo.create({
      date: '2026-06-01',
      description: 'Customer Payment',
      type: 'income',
      category: 'Revenue / Sales',
      amount: 50000,
      status: 'paid',
    });

    // Expense: $20,000
    await repo.create({
      date: '2026-06-05',
      description: 'Warehouse Lease Payment',
      type: 'expense',
      category: 'Rent & Facilities',
      amount: 20000,
      status: 'paid',
    });

    const txs = await repo.getAll();
    const summary = buildFinancialSummary(txs, OPENING_BALANCE, ANCHOR_DATE);

    assert.equal(summary.totalPaidIncome, 50000);
    assert.equal(summary.totalPaidExpenses, 20000);
    assert.equal(summary.netCashFlow, 30000, 'Net flow must be $50k - $20k = $30,000');
    assert.equal(summary.currentCashBalance, 130000, 'Current cash must be $100k + $30k = $130,000');
  });

  test('4. Verify pending transactions do NOT alter current operating cash balance or paid totals', async () => {
    // 1 Paid income: $50,000
    await repo.create({
      date: '2026-06-01',
      description: 'Settled Income',
      type: 'income',
      category: 'Revenue / Sales',
      amount: 50000,
      status: 'paid',
    });

    // 1 Pending receivable (AR): $40,000
    await repo.create({
      date: '2026-06-20',
      description: 'Unpaid Customer Invoice (AR)',
      type: 'income',
      category: 'Revenue / Sales',
      amount: 40000,
      status: 'pending',
    });

    // 1 Pending payable (AP): $15,000
    await repo.create({
      date: '2026-06-25',
      description: 'Unpaid Supplier Bill (AP)',
      type: 'expense',
      category: 'Cost of Goods Sold (COGS)',
      amount: 15000,
      status: 'pending',
    });

    const txs = await repo.getAll();
    const summary = buildFinancialSummary(txs, OPENING_BALANCE, ANCHOR_DATE);

    // Paid numbers must be unaffected by pending items
    assert.equal(summary.totalPaidIncome, 50000, 'Pending income must not be counted in paid income');
    assert.equal(summary.totalPaidExpenses, 0, 'Pending expense must not be counted in paid expense');
    assert.equal(summary.currentCashBalance, 150000, 'Operating cash must remain $150,000');

    // Pending numbers must be tracked in AR and AP
    assert.equal(summary.pendingReceivables, 40000, 'Pending AR must reflect $40,000');
    assert.equal(summary.pendingPayables, 15000, 'Pending AP must reflect $15,000');
  });

  test('5. Edit and delete transactions and confirm financial calculations update dynamically', async () => {
    const expense = await repo.create({
      date: '2026-06-05',
      description: 'Equipment Rental',
      type: 'expense',
      category: 'Rent & Facilities',
      amount: 20000,
      status: 'paid',
    });

    let txs = await repo.getAll();
    let summary = buildFinancialSummary(txs, OPENING_BALANCE, ANCHOR_DATE);
    assert.equal(summary.currentCashBalance, 80000, '$100k - $20k = $80,000');

    // Edit transaction: increase amount from $20,000 to $25,000
    const updateInput: UpdateTransactionInput = {
      amount: 25000,
      description: 'Equipment Rental (Adjusted)',
    };
    await repo.update(expense.id, updateInput);

    txs = await repo.getAll();
    summary = buildFinancialSummary(txs, OPENING_BALANCE, ANCHOR_DATE);
    assert.equal(summary.totalPaidExpenses, 25000);
    assert.equal(summary.currentCashBalance, 75000, '$100k - $25k = $75,000');

    // Delete transaction: cash should return to $100,000
    await repo.delete(expense.id);
    txs = await repo.getAll();
    summary = buildFinancialSummary(txs, OPENING_BALANCE, ANCHOR_DATE);
    assert.equal(summary.totalPaidExpenses, 0);
    assert.equal(summary.currentCashBalance, 100000, 'Current cash returns to $100,000 after deletion');
  });

  test('6. Confirm deterministic forecasts and risk alerts update after financial changes', async () => {
    // Create heavy expense causing burn and triggering risk alert
    await repo.create({
      date: '2026-06-01',
      description: 'Heavy Capital Outlay',
      type: 'expense',
      category: 'Rent & Facilities',
      amount: 90000,
      status: 'paid',
    });

    const txs = await repo.getAll();
    const summary = buildFinancialSummary(txs, OPENING_BALANCE, ANCHOR_DATE);

    // Cash is now down to $10,000
    assert.equal(summary.currentCashBalance, 10000);

    // High cash burn / shortage alert should be active
    assert.ok(summary.risks, 'Risks object must be present');
    assert.ok(
      summary.risks.overallRiskLevel === 'elevated' || summary.risks.overallRiskLevel === 'critical' || summary.risks.alerts.length > 0,
      'Risk level must flag low liquidity'
    );

    // Forecast ending balance must reflect low starting liquidity
    assert.ok(summary.forecast, 'Forecast must be computed');
    assert.equal(summary.forecast.startingCashBalance, 10000);
  });

  test('7. Restart the backend and verify persistence without data loss or re-seeding', async () => {
    // Add custom transactions before "restart"
    const tx1 = await repo.create({
      date: '2026-06-01',
      description: 'Pre-restart Customer Invoice',
      type: 'income',
      category: 'Revenue / Sales',
      amount: 60000,
      status: 'paid',
    });

    const tx2 = await repo.create({
      date: '2026-06-10',
      description: 'Pre-restart Raw Materials',
      type: 'expense',
      category: 'Cost of Goods Sold (COGS)',
      amount: 25000,
      status: 'paid',
    });

    const docCountBeforeRestart = isolatedStorage.getRawDocs().length;
    assert.equal(docCountBeforeRestart, 2);

    // --- SIMULATE SERVER RESTART ---
    // Create new repository instance pointing to the existing MongoDB database
    const restartedRepo = new TransactionRepository(() => mockDb as any);

    // Ensure seedIfEmpty does NOT wipe or overwrite existing documents
    await restartedRepo.seedIfEmpty();

    const docCountAfterRestart = isolatedStorage.getRawDocs().length;
    assert.equal(docCountAfterRestart, 2, 'Restarted server must NOT overwrite existing records');

    const retrieved1 = await restartedRepo.getById(tx1.id);
    const retrieved2 = await restartedRepo.getById(tx2.id);
    assert.ok(retrieved1 !== null);
    assert.ok(retrieved2 !== null);
    assert.equal(retrieved1?.amount, 60000);
    assert.equal(retrieved2?.amount, 25000);

    // Calculations on restarted repo match perfectly
    const allTxs = await restartedRepo.getAll();
    const summary = buildFinancialSummary(allTxs, OPENING_BALANCE, ANCHOR_DATE);
    assert.equal(summary.currentCashBalance, 135000); // 100k + 60k - 25k
  });

  test('8. Insufficient historical data detection correctly triggers limited data notice', async () => {
    // Only 1 transaction on 1 single day
    await repo.create({
      date: '2026-06-01',
      description: 'Single Isolated Transaction',
      type: 'income',
      category: 'Revenue / Sales',
      amount: 15000,
      status: 'paid',
    });

    const txs = await repo.getAll();
    const forecast = generateCashFlowForecast(txs, 115000, '2026-06-02', true);

    assert.equal(forecast.dataSufficiency.isSufficient, false, 'Single transaction must be marked insufficient');
    assert.ok(
      forecast.dataSufficiency.statusMessage.toLowerCase().includes('insufficient') ||
      forecast.dataSufficiency.statusMessage.toLowerCase().includes('limited'),
      'Status message must inform user of limited data'
    );
  });

  test('9. Missing / unconfigured opening balance handling without arbitrary guessing', async () => {
    await repo.create({
      date: '2026-06-01',
      description: 'Paid Income',
      type: 'income',
      category: 'Revenue / Sales',
      amount: 30000,
      status: 'paid',
    });

    // Opening balance explicitly passed as undefined / null
    const txs = await repo.getAll();
    const summary = buildFinancialSummary(txs, undefined, ANCHOR_DATE);

    assert.equal(summary.isOpeningBalanceConfigured, false, 'isOpeningBalanceConfigured must be false');
    assert.equal(summary.openingBalance, null, 'openingBalance must be null');
    // Delta from transactions is $30,000
    assert.equal(summary.currentCashBalance, 30000);
    assert.equal(summary.netCashFlow, 30000);
  });
});

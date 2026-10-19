import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { TransactionRepository, SEED_TRANSACTIONS } from '../transactionRepository';
import {
  setDatabaseInstanceForTesting,
  disconnectDatabase,
  isDatabaseConnected,
  sanitizeMongoUri,
} from '../../db/connection';
import { healthService } from '../../services/healthService';
import { AppError } from '../../middleware/errorHandler';
import { CreateTransactionInput, UpdateTransactionInput } from '../../types';

// In-memory mock collection that accurately mimics MongoDB's API for testing repository logic
class MockMongoCollection {
  private docs: any[] = [];
  public shouldFailWrites = false;

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

  public find(query: any = {}, _options?: any) {
    let result = [...this.docs];

    // Filter type
    if (query.type) {
      result = result.filter((d) => d.type === query.type);
    }
    // Filter status
    if (query.status) {
      result = result.filter((d) => d.status === query.status);
    }
    // Filter category
    if (query.category) {
      result = result.filter((d) => d.category === query.category);
    }
    // Filter date range
    if (query.date) {
      if (query.date.$gte) {
        result = result.filter((d) => d.date >= query.date.$gte);
      }
      if (query.date.$lte) {
        result = result.filter((d) => d.date <= query.date.$lte);
      }
    }
    // Filter $or (search)
    if (query.$or && Array.isArray(query.$or)) {
      result = result.filter((d) => {
        return query.$or.some((condition: any) => {
          if (condition.description?.$regex) {
            return condition.description.$regex.test(d.description);
          }
          if (condition.counterparty?.$regex) {
            return condition.counterparty.$regex.test(d.counterparty || '');
          }
          if (condition.category?.$regex) {
            return condition.category.$regex.test(d.category);
          }
          return false;
        });
      });
    }

    return {
      sort: (sortOptions: any) => {
        const [field, order] = Object.entries(sortOptions)[0] || ['date', -1];
        result.sort((a, b) => {
          if (field === 'date') {
            const cmp = (a.date || '').localeCompare(b.date || '');
            return order === 1 ? cmp : -cmp;
          }
          if (field === 'amount') {
            const cmp = (a.amount || 0) - (b.amount || 0);
            return order === 1 ? cmp : -cmp;
          }
          return 0;
        });
        return {
          toArray: async () => JSON.parse(JSON.stringify(result)),
        };
      },
      toArray: async () => JSON.parse(JSON.stringify(result)),
    };
  }

  public async findOne(query: any, _options?: any): Promise<any | null> {
    const doc = this.docs.find((d) => d.id === query.id);
    return doc ? JSON.parse(JSON.stringify(doc)) : null;
  }

  public async insertOne(doc: any): Promise<{ acknowledged: boolean; insertedId: any }> {
    if (this.shouldFailWrites) {
      return { acknowledged: false, insertedId: null };
    }
    this.docs.unshift(JSON.parse(JSON.stringify(doc)));
    return { acknowledged: true, insertedId: doc.id };
  }

  public async updateOne(
    query: any,
    update: any
  ): Promise<{ acknowledged: boolean; matchedCount: number; modifiedCount: number }> {
    if (this.shouldFailWrites) {
      return { acknowledged: false, matchedCount: 0, modifiedCount: 0 };
    }
    const index = this.docs.findIndex((d) => d.id === query.id);
    if (index === -1) {
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
    }
    const existing = this.docs[index];
    const updated = { ...existing, ...update.$set };
    this.docs[index] = updated;
    return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
  }

  public async deleteOne(query: any): Promise<{ acknowledged: boolean; deletedCount: number }> {
    if (this.shouldFailWrites) {
      return { acknowledged: false, deletedCount: 0 };
    }
    const index = this.docs.findIndex((d) => d.id === query.id);
    if (index === -1) {
      return { acknowledged: true, deletedCount: 0 };
    }
    this.docs.splice(index, 1);
    return { acknowledged: true, deletedCount: 1 };
  }

  public async deleteMany(_query: any): Promise<{ acknowledged: boolean; deletedCount: number }> {
    if (this.shouldFailWrites) {
      return { acknowledged: false, deletedCount: 0 };
    }
    const count = this.docs.length;
    this.docs = [];
    return { acknowledged: true, deletedCount: count };
  }

  public async insertMany(docs: any[]): Promise<{ acknowledged: boolean; insertedCount: number }> {
    if (this.shouldFailWrites) {
      return { acknowledged: false, insertedCount: 0 };
    }
    this.docs = JSON.parse(JSON.stringify(docs));
    return { acknowledged: true, insertedCount: docs.length };
  }
}

describe('Transaction MongoDB Repository & Resilience Tests', () => {
  let mockCollection: MockMongoCollection;
  let mockDb: any;
  let repository: TransactionRepository;

  beforeEach(() => {
    mockCollection = new MockMongoCollection(SEED_TRANSACTIONS);
    mockDb = {
      collection: (_name: string) => mockCollection,
    };
    repository = new TransactionRepository(() => mockDb);
  });

  afterEach(async () => {
    await disconnectDatabase();
    setDatabaseInstanceForTesting(null);
  });

  test('1. Database Disconnection - returns HTTP 503 and NEVER falls back silently to in-memory', async () => {
    // Disconnect database instance
    setDatabaseInstanceForTesting(null);
    const disconnectedRepo = new TransactionRepository();

    // Verify getAll fails with 503 AppError
    await assert.rejects(
      async () => {
        await disconnectedRepo.getAll();
      },
      (err: any) => {
        assert.ok(err instanceof AppError, 'Must throw AppError');
        assert.equal(err.statusCode, 503, 'Must return HTTP 503 Service Unavailable');
        assert.ok(err.message.includes('Database unavailable'), 'Must communicate database status');
        return true;
      }
    );

    // Verify create fails with 503 AppError
    await assert.rejects(
      async () => {
        await disconnectedRepo.create({
          date: '2026-10-12',
          description: 'Test Outflow',
          type: 'expense',
          category: 'Software & Cloud',
          amount: 500,
          status: 'paid',
        });
      },
      (err: any) => {
        assert.equal(err.statusCode, 503);
        return true;
      }
    );

    // Verify delete fails with 503 AppError
    await assert.rejects(
      async () => {
        await disconnectedRepo.delete('tx-001');
      },
      (err: any) => {
        assert.equal(err.statusCode, 503);
        return true;
      }
    );
  });

  test('2. Unacknowledged Write / Failure - returns HTTP 500 and does NOT return fake success', async () => {
    mockCollection.shouldFailWrites = true;

    // Create should throw 500 error when write not acknowledged
    await assert.rejects(
      async () => {
        await repository.create({
          date: '2026-10-12',
          description: 'Payment Attempt',
          type: 'income',
          category: 'Revenue / Sales',
          amount: 5000,
          status: 'paid',
        });
      },
      (err: any) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 500);
        assert.ok(err.message.includes('not acknowledged'));
        return true;
      }
    );

    // Delete should throw 500 error when write not acknowledged
    await assert.rejects(
      async () => {
        await repository.delete('tx-001');
      },
      (err: any) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 500);
        return true;
      }
    );
  });

  test('3. Transaction Creation - validates inputs, assigns consistent ID, and persists document', async () => {
    const input: CreateTransactionInput = {
      date: '2026-10-14',
      description: 'New Client Enterprise Contract',
      type: 'income',
      category: 'Revenue / Sales',
      amount: 45000,
      counterparty: 'Apex Global Enterprises',
      status: 'paid',
      notes: 'Initial Q4 retainer',
    };

    const created = await repository.create(input);

    assert.ok(created.id.startsWith('tx-'), 'Must generate a consistent tx- ID format');
    assert.equal(created.description, input.description);
    assert.equal(created.amount, 45000);
    assert.equal(created.status, 'paid');
    assert.ok(created.createdAt, 'Must include createdAt timestamp');
    assert.ok(created.updatedAt, 'Must include updatedAt timestamp');

    // Verify persisted record is returned via getById
    const fetched = await repository.getById(created.id);
    assert.ok(fetched !== null, 'Created transaction must be retrievable from repository');
    assert.equal(fetched?.id, created.id);
    assert.equal(fetched?.amount, 45000);
  });

  test('4. Transaction Listing & Filtering - supports query filters and ordering correctly', async () => {
    // Filter by type: income
    const incomeOnly = await repository.getAll({ type: 'income' });
    assert.ok(incomeOnly.length > 0);
    assert.ok(incomeOnly.every((tx) => tx.type === 'income'));

    // Filter by status: pending
    const pendingOnly = await repository.getAll({ status: 'pending' });
    assert.ok(pendingOnly.length > 0);
    assert.ok(pendingOnly.every((tx) => tx.status === 'pending'));

    // Filter by category
    const rentOnly = await repository.getAll({ category: 'Rent & Facilities' });
    assert.ok(rentOnly.length > 0);
    assert.ok(rentOnly.every((tx) => tx.category === 'Rent & Facilities'));

    // Filter by date range (June 2026)
    const juneOnly = await repository.getAll({
      startDate: '2026-06-01',
      endDate: '2026-06-30',
    });
    assert.ok(juneOnly.length > 0);
    assert.ok(juneOnly.every((tx) => tx.date >= '2026-06-01' && tx.date <= '2026-06-30'));

    // Search query matching description or counterparty
    const searchResult = await repository.getAll({ search: 'Payroll' });
    assert.ok(searchResult.length > 0);
    assert.ok(
      searchResult.every(
        (tx) =>
          tx.description.toLowerCase().includes('payroll') ||
          (tx.counterparty && tx.counterparty.toLowerCase().includes('payroll')) ||
          tx.category.toLowerCase().includes('payroll')
      )
    );

    // Sorting by amount desc
    const sortedAmount = await repository.getAll({ sortBy: 'amount', sortOrder: 'desc' });
    for (let i = 0; i < sortedAmount.length - 1; i++) {
      assert.ok(sortedAmount[i].amount >= sortedAmount[i + 1].amount, 'Must sort amount descending');
    }
  });

  test('5. Transaction Update - updates modified fields, preserves immutable ID & createdAt', async () => {
    const existing = await repository.getById('tx-001');
    assert.ok(existing !== null);
    const originalCreatedAt = existing!.createdAt;

    const updateInput: UpdateTransactionInput = {
      description: 'Bulk Distribution Settlement (Updated Memo)',
      amount: 41500,
      status: 'paid',
    };

    const updated = await repository.update('tx-001', updateInput);
    assert.ok(updated !== null);
    assert.equal(updated!.id, 'tx-001', 'ID must remain unchanged');
    assert.equal(updated!.createdAt, originalCreatedAt, 'Original createdAt must be preserved');
    assert.equal(updated!.description, 'Bulk Distribution Settlement (Updated Memo)');
    assert.equal(updated!.amount, 41500);

    // Verify non-existent ID update returns null
    const nonExistent = await repository.update('non-existent-id', { amount: 100 });
    assert.equal(nonExistent, null);
  });

  test('6. Transaction Deletion - removes document and returns appropriate status', async () => {
    const targetId = 'tx-002';
    const beforeCount = (await repository.getAll()).length;

    const deleted = await repository.delete(targetId);
    assert.equal(deleted, true);

    const afterCount = (await repository.getAll()).length;
    assert.equal(afterCount, beforeCount - 1);

    const fetchedAfter = await repository.getById(targetId);
    assert.equal(fetchedAfter, null);

    // Deleting already deleted ID returns false
    const deleteAgain = await repository.delete(targetId);
    assert.equal(deleteAgain, false);
  });

  test('7. Seed Management - seedIfEmpty populates empty collection; does not overwrite existing records', async () => {
    mockCollection.setDocs([]);
    assert.equal(await mockCollection.countDocuments(), 0);

    // First call: seeds default dataset
    await repository.seedIfEmpty();
    const countAfterFirstSeed = await mockCollection.countDocuments();
    assert.equal(countAfterFirstSeed, SEED_TRANSACTIONS.length);

    // Add a custom transaction
    await repository.create({
      date: '2026-10-15',
      description: 'Persistent Custom Entry',
      type: 'income',
      category: 'Revenue / Sales',
      amount: 12000,
      status: 'paid',
    });

    assert.equal(await mockCollection.countDocuments(), countAfterFirstSeed + 1);

    // Second call to seedIfEmpty (e.g. simulated server restart): must NOT overwrite or reset!
    await repository.seedIfEmpty();
    assert.equal(
      await mockCollection.countDocuments(),
      countAfterFirstSeed + 1,
      'Restarting with populated collection must preserve all records including newly added ones'
    );
  });

  test('8. Health Service - accurately reports server status and database connectivity', () => {
    // 1. When disconnected
    setDatabaseInstanceForTesting(null);
    assert.equal(isDatabaseConnected(), false);
    const healthDisconnected = healthService.getHealthStatus();

    assert.equal(healthDisconnected.status, 'degraded', 'Server health must report degraded when DB disconnected');
    assert.equal(healthDisconnected.database.status, 'disconnected');

    // 2. When connected via test instance
    setDatabaseInstanceForTesting(mockDb);
    assert.equal(isDatabaseConnected(), true);
    const healthConnected = healthService.getHealthStatus();

    assert.equal(healthConnected.status, 'ok', 'Server health must report ok when DB connected');
    assert.equal(healthConnected.database.status, 'connected');
    assert.equal(healthConnected.database.databaseName, 'finpilot');
  });

  test('9. Credential Sanitizer - scrubs passwords and usernames from connection URI strings', () => {
    const rawUri = 'mongodb+srv://admin_user:SuperSecretPassword123@prod-cluster.mongodb.net/finpilot?retryWrites=true';
    const sanitized = sanitizeMongoUri(rawUri);

    assert.ok(!sanitized.includes('SuperSecretPassword123'), 'Sanitized URI must not contain password');
    assert.ok(!sanitized.includes('admin_user:'), 'Sanitized URI must mask credentials');
    assert.ok(sanitized.includes('***:***'), 'Sanitized URI must substitute masked credentials');
  });
});

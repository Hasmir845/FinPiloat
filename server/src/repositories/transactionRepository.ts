import { Collection, Db, Filter, Sort } from 'mongodb';
import { Transaction, CreateTransactionInput, UpdateTransactionInput, TransactionType, PaymentStatus } from '../types';
import { getDatabase, connectDatabase, isDatabaseConnected } from '../db/connection';
import { AppError } from '../middleware/errorHandler';

/**
 * MONGODB PERSISTENT REPOSITORY
 * 
 * Implements transaction persistence using MongoDB Atlas.
 * Newly created, edited, and deleted records persist across backend restarts.
 * Database errors return explicit HTTP 503 / 500 errors and do NOT silently
 * fall back to in-memory storage or return fake success responses.
 */

// Initial Seed Dataset (Illustrative demo data for Apex Supply Chain Co.)
export const SEED_TRANSACTIONS: Transaction[] = [
  // MAY 2026
  {
    id: 'tx-001',
    date: '2026-05-06',
    description: 'Bulk Distribution Settlement #401',
    type: 'income',
    category: 'Revenue / Sales',
    amount: 38000,
    counterparty: 'Midwest Wholesalers',
    status: 'paid',
    notes: 'Q2 initial delivery run',
    createdAt: '2026-05-06T10:00:00.000Z',
    updatedAt: '2026-05-06T10:00:00.000Z',
  },
  {
    id: 'tx-002',
    date: '2026-05-12',
    description: 'Warehouse Lease & Operations',
    type: 'expense',
    category: 'Rent & Facilities',
    amount: 9400,
    counterparty: 'Midtown Commercial Lease',
    status: 'paid',
    notes: 'May facility rent',
    createdAt: '2026-05-12T10:00:00.000Z',
    updatedAt: '2026-05-12T10:00:00.000Z',
  },
  {
    id: 'tx-003',
    date: '2026-05-15',
    description: 'Bi-weekly Staff Payroll',
    type: 'expense',
    category: 'Payroll & Wages',
    amount: 18500,
    counterparty: 'Apex Payroll Processing',
    status: 'paid',
    createdAt: '2026-05-15T10:00:00.000Z',
    updatedAt: '2026-05-15T10:00:00.000Z',
  },
  {
    id: 'tx-004',
    date: '2026-05-22',
    description: 'Logistics Fleet Maintenance',
    type: 'expense',
    category: 'Freight & Logistics',
    amount: 5100,
    counterparty: 'Metro Fleet Services',
    status: 'paid',
    createdAt: '2026-05-22T10:00:00.000Z',
    updatedAt: '2026-05-22T10:00:00.000Z',
  },
  {
    id: 'tx-005',
    date: '2026-05-28',
    description: 'Specialized Supply Chain Consulting',
    type: 'income',
    category: 'Consulting & Services',
    amount: 14000,
    counterparty: 'OmniTrade Partners',
    status: 'paid',
    createdAt: '2026-05-28T10:00:00.000Z',
    updatedAt: '2026-05-28T10:00:00.000Z',
  },

  // JUNE 2026
  {
    id: 'tx-006',
    date: '2026-06-04',
    description: 'Retail Partner Restock Invoice #612',
    type: 'income',
    category: 'Revenue / Sales',
    amount: 42000,
    counterparty: 'Cascade Retail Group',
    status: 'paid',
    createdAt: '2026-06-04T10:00:00.000Z',
    updatedAt: '2026-06-04T10:00:00.000Z',
  },
  {
    id: 'tx-007',
    date: '2026-06-10',
    description: 'Cloud Logistics & ERP Subscription',
    type: 'expense',
    category: 'Software & Cloud',
    amount: 3200,
    counterparty: 'Cloud Logistics SaaS',
    status: 'paid',
    createdAt: '2026-06-10T10:00:00.000Z',
    updatedAt: '2026-06-10T10:00:00.000Z',
  },
  {
    id: 'tx-008',
    date: '2026-06-15',
    description: 'Bi-weekly Staff Payroll',
    type: 'expense',
    category: 'Payroll & Wages',
    amount: 18500,
    counterparty: 'Apex Payroll Processing',
    status: 'paid',
    createdAt: '2026-06-15T10:00:00.000Z',
    updatedAt: '2026-06-15T10:00:00.000Z',
  },
  {
    id: 'tx-009',
    date: '2026-06-25',
    description: 'Regional Freight Carrier Fees',
    type: 'expense',
    category: 'Freight & Logistics',
    amount: 14300,
    counterparty: 'Northwest Regional Logistics',
    status: 'paid',
    createdAt: '2026-06-25T10:00:00.000Z',
    updatedAt: '2026-06-25T10:00:00.000Z',
  },

  // JULY 2026
  {
    id: 'tx-010',
    date: '2026-07-08',
    description: 'Distributor Contract Settlement #704',
    type: 'income',
    category: 'Revenue / Sales',
    amount: 36000,
    counterparty: 'Summit Distribution',
    status: 'paid',
    createdAt: '2026-07-08T10:00:00.000Z',
    updatedAt: '2026-07-08T10:00:00.000Z',
  },
  {
    id: 'tx-011',
    date: '2026-07-15',
    description: 'Bi-weekly Staff Payroll & Seasonal Overtime',
    type: 'expense',
    category: 'Payroll & Wages',
    amount: 21500,
    counterparty: 'Apex Payroll Processing',
    status: 'paid',
    createdAt: '2026-07-15T10:00:00.000Z',
    updatedAt: '2026-07-15T10:00:00.000Z',
  },
  {
    id: 'tx-012',
    date: '2026-07-20',
    description: 'Warehouse Facility Lease',
    type: 'expense',
    category: 'Rent & Facilities',
    amount: 9400,
    counterparty: 'Midtown Commercial Lease',
    status: 'paid',
    createdAt: '2026-07-20T10:00:00.000Z',
    updatedAt: '2026-07-20T10:00:00.000Z',
  },

  // AUGUST 2026
  {
    id: 'tx-013',
    date: '2026-08-05',
    description: 'Commercial Client Retainer Inflow',
    type: 'income',
    category: 'Revenue / Sales',
    amount: 48000,
    counterparty: 'Apex Prime Commercial',
    status: 'paid',
    createdAt: '2026-08-05T10:00:00.000Z',
    updatedAt: '2026-08-05T10:00:00.000Z',
  },
  {
    id: 'tx-014',
    date: '2026-08-15',
    description: 'Bi-weekly Staff Payroll',
    type: 'expense',
    category: 'Payroll & Wages',
    amount: 19000,
    counterparty: 'Apex Payroll Processing',
    status: 'paid',
    createdAt: '2026-08-15T10:00:00.000Z',
    updatedAt: '2026-08-15T10:00:00.000Z',
  },
  {
    id: 'tx-015',
    date: '2026-08-22',
    description: 'Equipment Lease & Packaging Supplies',
    type: 'expense',
    category: 'Supplies & Equipment',
    amount: 8200,
    counterparty: 'PackTech Solutions',
    status: 'paid',
    createdAt: '2026-08-22T10:00:00.000Z',
    updatedAt: '2026-08-22T10:00:00.000Z',
  },

  // SEPTEMBER 2026
  {
    id: 'tx-016',
    date: '2026-09-07',
    description: 'Wholesale Shipment Settlement #901',
    type: 'income',
    category: 'Revenue / Sales',
    amount: 51000,
    counterparty: 'National Retail Partners',
    status: 'paid',
    createdAt: '2026-09-07T10:00:00.000Z',
    updatedAt: '2026-09-07T10:00:00.000Z',
  },
  {
    id: 'tx-017',
    date: '2026-09-15',
    description: 'Bi-weekly Staff Payroll',
    type: 'expense',
    category: 'Payroll & Wages',
    amount: 19500,
    counterparty: 'Apex Payroll Processing',
    status: 'paid',
    createdAt: '2026-09-15T10:00:00.000Z',
    updatedAt: '2026-09-15T10:00:00.000Z',
  },
  {
    id: 'tx-018',
    date: '2026-09-24',
    description: 'Freight Routing & Transport',
    type: 'expense',
    category: 'Freight & Logistics',
    amount: 11200,
    counterparty: 'Pacific Freight Lines',
    status: 'paid',
    createdAt: '2026-09-24T10:00:00.000Z',
    updatedAt: '2026-09-24T10:00:00.000Z',
  },

  // OCTOBER 2026 (CURRENT ACTIVE PERIOD)
  {
    id: 'tx-101',
    date: '2026-10-02',
    description: 'Northwest Regional Logistics Settlement',
    type: 'expense',
    category: 'Freight & Logistics',
    amount: 12300,
    counterparty: 'Northwest Regional Logistics',
    status: 'paid',
    notes: 'Q3 cross-docking freight fee',
    createdAt: '2026-10-02T10:00:00.000Z',
    updatedAt: '2026-10-02T10:00:00.000Z',
  },
  {
    id: 'tx-102',
    date: '2026-10-05',
    description: 'Warehouse Commercial Lease (October)',
    type: 'expense',
    category: 'Rent & Facilities',
    amount: 9400,
    counterparty: 'Midtown Commercial Lease',
    status: 'paid',
    createdAt: '2026-10-05T10:00:00.000Z',
    updatedAt: '2026-10-05T10:00:00.000Z',
  },
  {
    id: 'tx-103',
    date: '2026-10-08',
    description: 'Vanguard Retail Corp (Invoice #2041)',
    type: 'income',
    category: 'Revenue / Sales',
    amount: 24500,
    counterparty: 'Vanguard Retail Corp',
    status: 'pending',
    notes: 'Payment terms net 30, currently awaiting settlement',
    createdAt: '2026-10-08T10:00:00.000Z',
    updatedAt: '2026-10-08T10:00:00.000Z',
  },
  {
    id: 'tx-104',
    date: '2026-10-10',
    description: 'Cloud Infrastructure & ERP SaaS',
    type: 'expense',
    category: 'Software & Cloud',
    amount: 3200,
    counterparty: 'Cloud Hosting & Infrastructure',
    status: 'paid',
    createdAt: '2026-10-10T10:00:00.000Z',
    updatedAt: '2026-10-10T10:00:00.000Z',
  },
  {
    id: 'tx-105',
    date: '2026-10-11',
    description: 'Acme Distribution Network Settlement',
    type: 'income',
    category: 'Revenue / Sales',
    amount: 18500,
    counterparty: 'Acme Distribution Network',
    status: 'paid',
    notes: 'Settled via electronic bank wire',
    createdAt: '2026-10-11T10:00:00.000Z',
    updatedAt: '2026-10-11T10:00:00.000Z',
  },
  {
    id: 'tx-106',
    date: '2026-10-15',
    description: 'Mid-Month Operations Payroll Run',
    type: 'expense',
    category: 'Payroll & Wages',
    amount: 19500,
    counterparty: 'Apex Payroll Processing',
    status: 'pending',
    notes: 'Scheduled for payroll processing window',
    createdAt: '2026-10-12T08:00:00.000Z',
    updatedAt: '2026-10-12T08:00:00.000Z',
  },
  {
    id: 'tx-107',
    date: '2026-10-24',
    description: 'Estimated State & Federal Quarterly Tax Deposit',
    type: 'expense',
    category: 'Tax & Statutory',
    amount: 14200,
    counterparty: 'Tax Authority Escrow',
    status: 'pending',
    notes: 'Q3 estimated quarterly tax installment',
    createdAt: '2026-10-12T08:00:00.000Z',
    updatedAt: '2026-10-12T08:00:00.000Z',
  },
  {
    id: 'tx-108',
    date: '2026-10-28',
    description: 'Contract Milestone 2 Invoice #998',
    type: 'income',
    category: 'Consulting & Services',
    amount: 19000,
    counterparty: 'Global Logistics Hub',
    status: 'pending',
    notes: 'Scheduled milestone completion invoice',
    createdAt: '2026-10-12T08:00:00.000Z',
    updatedAt: '2026-10-12T08:00:00.000Z',
  },
];

/**
 * Escapes special regex characters in user search queries to prevent regex injection.
 */
function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * Maps raw database document to standard Transaction interface.
 */
function mapDocToTransaction(doc: any): Transaction {
  return {
    id: String(doc.id),
    date: String(doc.date),
    description: String(doc.description),
    type: doc.type as TransactionType,
    category: String(doc.category),
    amount: Number(doc.amount),
    counterparty: doc.counterparty ? String(doc.counterparty) : '',
    status: doc.status as PaymentStatus,
    notes: doc.notes ? String(doc.notes) : '',
    createdAt: String(doc.createdAt || new Date().toISOString()),
    updatedAt: String(doc.updatedAt || new Date().toISOString()),
  };
}

export class TransactionRepository {
  private dbGetter: () => Db | Promise<Db>;

  constructor(dbGetter: () => Db | Promise<Db> = getDatabase) {
    this.dbGetter = dbGetter;
  }

  private async getCollection(): Promise<Collection<any>> {
    // In serverless environments, lazily establish and cache connection on first database query when using default getDatabase
    if (this.dbGetter === getDatabase && !isDatabaseConnected() && process.env.MONGODB_URI && process.env.MONGODB_URI.trim().length > 0) {
      await connectDatabase();
    }
    const db = await this.dbGetter();
    return db.collection('transactions');
  }

  /**
   * Retrieves all transactions matching optional filter and sorting parameters.
   */
  public async getAll(filters?: {
    type?: string;
    status?: string;
    category?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: 'date' | 'amount';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Transaction[]> {
    const collection = await this.getCollection();
    const query: Filter<any> = {};

    if (filters) {
      if (filters.type && (filters.type === 'income' || filters.type === 'expense')) {
        query.type = filters.type;
      }
      if (filters.status && (filters.status === 'paid' || filters.status === 'pending')) {
        query.status = filters.status;
      }
      if (filters.category && filters.category !== 'all') {
        query.category = filters.category;
      }
      if (filters.startDate || filters.endDate) {
        query.date = {};
        if (filters.startDate) query.date.$gte = filters.startDate;
        if (filters.endDate) query.date.$lte = filters.endDate;
      }
      if (filters.search) {
        const queryPattern = new RegExp(escapeRegex(filters.search.trim()), 'i');
        query.$or = [
          { description: { $regex: queryPattern } },
          { counterparty: { $regex: queryPattern } },
          { category: { $regex: queryPattern } },
        ];
      }
    }

    const sortBy = filters?.sortBy === 'amount' ? 'amount' : 'date';
    const sortOrder = filters?.sortOrder === 'asc' ? 1 : -1;
    const sortOptions: Sort = { [sortBy]: sortOrder };

    if (sortBy === 'date') {
      sortOptions.createdAt = -1;
    }

    const docs = await collection
      .find(query, { projection: { _id: 0 } })
      .sort(sortOptions)
      .toArray();

    return docs.map(mapDocToTransaction);
  }

  /**
   * Retrieves a single transaction by its unique ID.
   */
  public async getById(id: string): Promise<Transaction | null> {
    const collection = await this.getCollection();
    const doc = await collection.findOne({ id }, { projection: { _id: 0 } });
    return doc ? mapDocToTransaction(doc) : null;
  }

  /**
   * Creates a new transaction and persists it in MongoDB.
   */
  public async create(data: CreateTransactionInput): Promise<Transaction> {
    const collection = await this.getCollection();

    const newTx: Transaction = {
      id: `tx-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`,
      date: data.date,
      description: data.description,
      type: data.type,
      category: data.category,
      amount: data.amount,
      counterparty: data.counterparty || '',
      status: data.status,
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const insertResult = await collection.insertOne({ ...newTx });
    if (!insertResult.acknowledged) {
      throw new AppError('Failed to record transaction in database. Write was not acknowledged.', 500);
    }

    return newTx;
  }

  /**
   * Updates an existing transaction by ID. Preserves original ID and createdAt.
   */
  public async update(id: string, data: UpdateTransactionInput): Promise<Transaction | null> {
    const collection = await this.getCollection();
    const existing = await this.getById(id);
    if (!existing) return null;

    const updatedTx: Transaction = {
      ...existing,
      ...data,
      id: existing.id, // Immutable ID
      createdAt: existing.createdAt, // Immutable original timestamp
      updatedAt: new Date().toISOString(),
    };

    const updateResult = await collection.updateOne(
      { id },
      {
        $set: {
          ...(data.date !== undefined && { date: data.date }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.type !== undefined && { type: data.type }),
          ...(data.category !== undefined && { category: data.category }),
          ...(data.amount !== undefined && { amount: data.amount }),
          ...(data.counterparty !== undefined && { counterparty: data.counterparty }),
          ...(data.status !== undefined && { status: data.status }),
          ...(data.notes !== undefined && { notes: data.notes }),
          updatedAt: updatedTx.updatedAt,
        },
      }
    );

    if (!updateResult.acknowledged) {
      throw new AppError('Failed to update transaction in database. Write was not acknowledged.', 500);
    }

    return updatedTx;
  }

  /**
   * Deletes a transaction by ID.
   */
  public async delete(id: string): Promise<boolean> {
    const collection = await this.getCollection();
    const deleteResult = await collection.deleteOne({ id });

    if (!deleteResult.acknowledged) {
      throw new AppError('Failed to delete transaction from database. Operation was not acknowledged.', 500);
    }

    return deleteResult.deletedCount > 0;
  }

  /**
   * Resets the database collection back to the initial demonstration seed dataset.
   */
  public async resetToSeed(): Promise<Transaction[]> {
    const collection = await this.getCollection();
    await collection.deleteMany({});
    const seedDocs = SEED_TRANSACTIONS.map((tx) => ({ ...tx }));
    const insertResult = await collection.insertMany(seedDocs);

    if (!insertResult.acknowledged) {
      throw new AppError('Failed to reset demo dataset in database. Write was not acknowledged.', 500);
    }

    return [...SEED_TRANSACTIONS];
  }

  /**
   * Checks whether the collection is empty. If empty, seeds initial demonstration transactions
   * and creates database indexes for performance and integrity.
   */
  public async seedIfEmpty(): Promise<void> {
    const collection = await this.getCollection();

    // Create indexes safely
    try {
      await collection.createIndex({ id: 1 }, { unique: true });
      await collection.createIndex({ date: -1 });
      await collection.createIndex({ status: 1 });
      await collection.createIndex({ type: 1 });
    } catch (indexErr) {
      console.warn('[FinPilot DB] Warning creating collection indexes:', indexErr instanceof Error ? indexErr.message : indexErr);
    }

    const count = await collection.countDocuments();
    if (count === 0) {
      const seedDocs = SEED_TRANSACTIONS.map((tx) => ({ ...tx }));
      await collection.insertMany(seedDocs);
      console.log(`[FinPilot DB] Seeded initial ${seedDocs.length} demonstration records into MongoDB collection 'transactions'.`);
    }
  }
}

export const transactionRepository = new TransactionRepository();

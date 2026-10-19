import { MongoClient, Db, MongoClientOptions } from 'mongodb';
import { AppError } from '../middleware/errorHandler';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

let client: MongoClient | null = null;
let db: Db | null = null;
let connectionState: ConnectionState = 'disconnected';
let lastErrorMessage: string | null = null;
let connectingPromise: Promise<Db> | null = null;
let activeDbName: string | null = null;

const DEFAULT_DB_NAME = 'finpilot';

/**
 * Sanitizes a MongoDB connection URI to mask credentials in log messages.
 * Prevents accidental credential leaks in console outputs or telemetry.
 */
export function sanitizeMongoUri(uri?: string): string {
  if (!uri) return '';
  return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
}

/**
 * Extracts database name from MongoDB connection string URI path if present.
 * Preserves exact casing (e.g. 'FinPilot').
 */
export function extractDbNameFromUri(uri?: string): string | null {
  if (!uri) return null;
  try {
    const normalized = uri.replace(/^mongodb(\+srv)?:\/\//i, 'http://');
    const parsed = new URL(normalized);
    const pathname = parsed.pathname.replace(/^\//, '').split('?')[0].trim();
    if (pathname.length > 0 && !pathname.includes('/')) {
      return decodeURIComponent(pathname);
    }
  } catch {
    // URL parsing fallback
  }

  const match = uri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?/\\]+)/i);
  if (match && match[1] && match[1].trim().length > 0) {
    return decodeURIComponent(match[1].trim());
  }

  return null;
}

/**
 * Retrieves the configured database name from environment variables or connection URI.
 * Respects casing and prioritizes:
 * 1. MONGODB_DB_NAME
 * 2. Database specified in MONGODB_URI path
 * 3. DEFAULT_DB_NAME ('finpilot')
 */
export function getDatabaseName(): string {
  if (activeDbName && connectionState === 'connected') {
    return activeDbName;
  }
  if (process.env.MONGODB_DB_NAME && process.env.MONGODB_DB_NAME.trim().length > 0) {
    return process.env.MONGODB_DB_NAME.trim();
  }
  const fromUri = extractDbNameFromUri(process.env.MONGODB_URI);
  if (fromUri) {
    return fromUri;
  }
  return DEFAULT_DB_NAME;
}

/**
 * Checks whether the database connection is currently established and ready.
 */
export function isDatabaseConnected(): boolean {
  return connectionState === 'connected' && db !== null;
}

/**
 * Returns detailed connection health status.
 */
export function getConnectionStatus(): {
  state: ConnectionState;
  dbName: string;
  configured: boolean;
  message?: string;
} {
  const configured = Boolean(process.env.MONGODB_URI && process.env.MONGODB_URI.trim().length > 0);
  return {
    state: connectionState,
    dbName: activeDbName || getDatabaseName(),
    configured,
    message: lastErrorMessage || (isDatabaseConnected() ? 'Connected to MongoDB Atlas' : undefined),
  };
}

/**
 * Retrieves the active database instance.
 * Throws a 503 AppError if the database is not connected.
 */
export function getDatabase(): Db {
  if (!db || connectionState !== 'connected') {
    throw new AppError(
      'Database unavailable. MongoDB Atlas connection is not active. Please ensure MONGODB_URI is configured and the database cluster is reachable.',
      503
    );
  }
  return db;
}

/**
 * Establishes a persistent connection pool to MongoDB Atlas.
 * Caches in-flight connection promise to prevent race conditions and connection storms in serverless environments.
 */
export async function connectDatabase(): Promise<Db> {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.trim().length === 0) {
    connectionState = 'disconnected';
    lastErrorMessage = 'MONGODB_URI environment variable is not configured.';
    throw new AppError(
      'MONGODB_URI environment variable is missing. Database connection cannot be initialized.',
      503
    );
  }

  // If already connected and client is active, return the existing database instance
  if (client && db && connectionState === 'connected') {
    return db;
  }

  // If already connecting, reuse the in-flight promise
  if (connectingPromise) {
    return connectingPromise;
  }

  connectionState = 'connecting';
  lastErrorMessage = null;

  const dbName = getDatabaseName();

  const options: MongoClientOptions = {
    serverSelectionTimeoutMS: 4000, // 4s timeout to fail quickly in serverless environments
    connectTimeoutMS: 4000,
    socketTimeoutMS: 8000,
    maxPoolSize: 10,
    minPoolSize: 0,
  };

  connectingPromise = (async () => {
    try {
      const newClient = new MongoClient(uri, options);
      await newClient.connect();

      let resolvedDbName = getDatabaseName();

      // Case-sensitivity guard for MongoDB Atlas WiredTiger engines:
      // If a database already exists whose name differs only by letter casing (e.g. 'FinPilot' vs 'finpilot'),
      // MongoDB throws: "db already exists with different case already have: [FinPilot] trying to create [finpilot]".
      // We proactively inspect existing databases and align with the existing database casing.
      try {
        const adminDb = newClient.db().admin();
        const dbList = await adminDb.listDatabases({ nameOnly: true });
        if (dbList && Array.isArray(dbList.databases)) {
          const matchedDb = dbList.databases.find(
            (item: { name?: string }) =>
              typeof item?.name === 'string' &&
              item.name.toLowerCase() === resolvedDbName.toLowerCase()
          );
          if (matchedDb?.name) {
            if (matchedDb.name !== resolvedDbName) {
              console.log(
                `[MongoDB] Aligning database name case: using existing database '${matchedDb.name}' instead of '${resolvedDbName}'`
              );
            }
            resolvedDbName = matchedDb.name;
          }
        }
      } catch {
        // If MongoDB user lacks listDatabases admin privilege, continue with resolvedDbName
      }

      // Verify connectivity via ping command
      const database = newClient.db(resolvedDbName);
      await database.command({ ping: 1 });

      client = newClient;
      db = database;
      activeDbName = resolvedDbName;
      connectionState = 'connected';
      lastErrorMessage = null;

      return db;
    } catch (error: unknown) {
      connectionState = 'error';
      const rawMessage = error instanceof Error ? error.message : 'Unknown connection failure';
      // Ensure credentials never leak in stored error message
      lastErrorMessage = sanitizeMongoUri(rawMessage);

      if (client) {
        try {
          await client.close();
        } catch {
          // Ignore close error during teardown
        }
        client = null;
        db = null;
        activeDbName = null;
      }

      throw new AppError(
        `Failed to establish connection to MongoDB Atlas: ${lastErrorMessage}`,
        503
      );
    } finally {
      connectingPromise = null;
    }
  })();

  return connectingPromise;
}

/**
 * Returns active database instance or lazily initiates connection if not yet connected.
 */
export async function ensureDatabaseConnected(): Promise<Db> {
  if (db && connectionState === 'connected') {
    return db;
  }
  return connectDatabase();
}

/**
 * Closes the active MongoDB connection pool cleanly.
 */
export async function disconnectDatabase(): Promise<void> {
  connectingPromise = null;
  if (client) {
    try {
      await client.close();
    } finally {
      client = null;
      db = null;
      activeDbName = null;
      connectionState = 'disconnected';
      lastErrorMessage = null;
    }
  } else {
    connectionState = 'disconnected';
    db = null;
    activeDbName = null;
    lastErrorMessage = null;
  }
}

/**
 * Testing utility to inject mock Db instances for unit and integration testing.
 */
export function setDatabaseInstanceForTesting(mockDb: Db | null, mockClient?: MongoClient | null): void {
  db = mockDb;
  client = mockClient || null;
  connectingPromise = null;
  connectionState = mockDb ? 'connected' : 'disconnected';
  activeDbName = mockDb ? getDatabaseName() : null;
  lastErrorMessage = null;
}

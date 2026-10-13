import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from '../config/env';
import { RunResult } from '../types/database.types';

// Use verbose mode in development for enhanced diagnostic logs
const sqlite = config.nodeEnv === 'development' ? sqlite3.verbose() : sqlite3;

export class DatabaseService {
  private static instance: DatabaseService | null = null;
  private db: sqlite3.Database | null = null;
  private connectionPromise: Promise<sqlite3.Database> | null = null;

  private constructor() {}

  /**
   * Access singleton instance
   */
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Initializes and returns the active SQLite database connection with security and integrity pragma settings
   */
  public async getConnection(): Promise<sqlite3.Database> {
    if (this.db) {
      return this.db;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.connect();
    return this.connectionPromise;
  }

  /**
   * Establishes a secure connection to the SQLite database
   */
  private async connect(): Promise<sqlite3.Database> {
    const dbPath = config.databasePath;
    const dbDir = path.dirname(dbPath);

    // Verify parent directory exists or create it
    try {
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log(`[Database] Created missing database directory: ${dbDir}`);
      }
    } catch (fsErr) {
      const errorMsg = fsErr instanceof Error ? fsErr.message : String(fsErr);
      throw new Error(`[Database Init Error] Unable to verify or create directory for SQLite database at '${dbDir}': ${errorMsg}`);
    }

    return new Promise<sqlite3.Database>((resolve, reject) => {
      console.log(`[Database] Connecting to SQLite database at: ${dbPath}`);

      const connection = new sqlite.Database(
        dbPath,
        sqlite.OPEN_READWRITE | sqlite.OPEN_CREATE,
        async (err) => {
          if (err) {
            console.error(`[Database Error] Failed to open SQLite database at '${dbPath}':`, err.message);
            this.connectionPromise = null;
            reject(new Error(`Failed to connect to SQLite database at ${dbPath}: ${err.message}`));
            return;
          }

          try {
            // Apply security and performance PRAGMA statements
            await this.executePragmas(connection);
            this.db = connection;
            this.connectionPromise = null;
            console.log(`[Database] Successfully connected and configured SQLite database at: ${dbPath}`);
            resolve(connection);
          } catch (pragmaErr) {
            console.error('[Database Error] Failed to configure database PRAGMAs:', pragmaErr);
            connection.close();
            this.connectionPromise = null;
            reject(pragmaErr);
          }
        }
      );
    });
  }

  /**
   * Configures SQLite pragmas for security, foreign key enforcement, and concurrent performance (WAL mode)
   */
  private executePragmas(connection: sqlite3.Database): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      connection.serialize(() => {
        // Enforce foreign key constraints
        connection.run('PRAGMA foreign_keys = ON;', (err) => {
          if (err) return reject(new Error(`PRAGMA foreign_keys error: ${err.message}`));
        });

        // Set Write-Ahead Logging (WAL) for superior concurrency and durability
        connection.run('PRAGMA journal_mode = WAL;', (err) => {
          if (err) return reject(new Error(`PRAGMA journal_mode error: ${err.message}`));
        });

        // Set synchronous mode to NORMAL (safe and fast with WAL)
        connection.run('PRAGMA synchronous = NORMAL;', (err) => {
          if (err) return reject(new Error(`PRAGMA synchronous error: ${err.message}`));
        });

        // Busy timeout to gracefully wait instead of immediately failing on lock contention
        connection.run('PRAGMA busy_timeout = 5000;', (err) => {
          if (err) return reject(new Error(`PRAGMA busy_timeout error: ${err.message}`));
          resolve();
        });
      });
    });
  }

  /**
   * Execute parameterized query (INSERT, UPDATE, DELETE) returning lastID and changes count
   */
  public async run(sql: string, params: unknown[] = []): Promise<RunResult> {
    const connection = await this.getConnection();
    return new Promise<RunResult>((resolve, reject) => {
      connection.run(sql, params, function (this: sqlite3.RunResult, err: Error | null) {
        if (err) {
          console.error(`[Database Query Error] SQL: ${sql} | Params: ${JSON.stringify(params)} | Error: ${err.message}`);
          return reject(new Error(`Database execution failed: ${err.message}`));
        }
        resolve({
          lastID: this.lastID,
          changes: this.changes,
        });
      });
    });
  }

  /**
   * Execute parameterized query returning a single record
   */
  public async get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    const connection = await this.getConnection();
    return new Promise<T | undefined>((resolve, reject) => {
      connection.get(sql, params, (err: Error | null, row: unknown) => {
        if (err) {
          console.error(`[Database Query Error] SQL: ${sql} | Params: ${JSON.stringify(params)} | Error: ${err.message}`);
          return reject(new Error(`Database query failed: ${err.message}`));
        }
        resolve(row as T | undefined);
      });
    });
  }

  /**
   * Execute parameterized query returning an array of records
   */
  public async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const connection = await this.getConnection();
    return new Promise<T[]>((resolve, reject) => {
      connection.all(sql, params, (err: Error | null, rows: unknown[]) => {
        if (err) {
          console.error(`[Database Query Error] SQL: ${sql} | Params: ${JSON.stringify(params)} | Error: ${err.message}`);
          return reject(new Error(`Database query failed: ${err.message}`));
        }
        resolve((rows || []) as T[]);
      });
    });
  }

  /**
   * Execute raw SQL statements (e.g. multi-line DDL scripts)
   */
  public async exec(sql: string): Promise<void> {
    const connection = await this.getConnection();
    return new Promise<void>((resolve, reject) => {
      connection.exec(sql, (err: Error | null) => {
        if (err) {
          console.error(`[Database Exec Error] Error: ${err.message}\nSQL Script: ${sql}`);
          return reject(new Error(`Database batch execution failed: ${err.message}`));
        }
        resolve();
      });
    });
  }

  /**
   * Runs an operation inside an SQLite transaction
   */
  public async transaction<T>(action: () => Promise<T>): Promise<T> {
    await this.run('BEGIN TRANSACTION;');
    try {
      const result = await action();
      await this.run('COMMIT;');
      return result;
    } catch (error) {
      await this.run('ROLLBACK;');
      throw error;
    }
  }

  /**
   * Health check to verify database readiness
   */
  public async checkHealth(): Promise<{ isHealthy: boolean; databasePath: string; details?: string }> {
    try {
      const result = await this.get<{ ping: number }>('SELECT 1 AS ping;');
      const isHealthy = result?.ping === 1;
      return {
        isHealthy,
        databasePath: config.databasePath,
      };
    } catch (err) {
      return {
        isHealthy: false,
        databasePath: config.databasePath,
        details: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Closes database connection cleanly
   */
  public async close(): Promise<void> {
    if (!this.db) {
      return;
    }

    const currentDb = this.db;
    this.db = null;
    this.connectionPromise = null;

    return new Promise<void>((resolve, reject) => {
      currentDb.close((err) => {
        if (err) {
          console.error('[Database Error] Error while closing SQLite database:', err.message);
          return reject(err);
        }
        console.log('[Database] SQLite database connection closed cleanly.');
        resolve();
      });
    });
  }
}

// Export default singleton instance
export const db = DatabaseService.getInstance();

import { db } from './connection';
import { SchemaMetadata, TableColumnInfo } from '../types/database.types';

export const SCHEMA_SQL = `
-- Applications dataset: Tracks loan / product applications by period and business segment
CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month TEXT NOT NULL,
  segment TEXT NOT NULL,
  count INTEGER NOT NULL CHECK (count >= 0),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient analytical slice-and-dice
CREATE INDEX IF NOT EXISTS idx_applications_month ON applications (month);
CREATE INDEX IF NOT EXISTS idx_applications_segment ON applications (segment);
CREATE INDEX IF NOT EXISTS idx_applications_month_segment ON applications (month, segment);

-- Branches dataset: Tracks operational metrics and credit approval/rejection rates across branches
CREATE TABLE IF NOT EXISTS branches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  rejection_rate REAL NOT NULL CHECK (rejection_rate >= 0.0 AND rejection_rate <= 1.0),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_branches_rejection_rate ON branches (rejection_rate);
CREATE INDEX IF NOT EXISTS idx_branches_name ON branches (name);

-- Customers dataset: Tracks client portfolios and cumulative transaction values
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  transaction_value REAL NOT NULL CHECK (transaction_value >= 0.0),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_transaction_value ON customers (transaction_value);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers (name);
`;

/**
 * Initializes database tables, constraints, and performance indexes
 */
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('[Schema] Initializing banking database schema...');
    await db.exec(SCHEMA_SQL);
    console.log('[Schema] Successfully initialized all banking database tables and indexes.');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Schema Error] Failed to initialize database schema:', errorMsg);
    throw new Error(`Database schema initialization failed: ${errorMsg}`);
  }
}

/**
 * Introspects table metadata to assist the conversational analyst LLM in generating accurate queries
 */
export async function getDatabaseSchemaMetadata(): Promise<SchemaMetadata[]> {
  const tables = ['applications', 'branches', 'customers'];
  const metadataList: SchemaMetadata[] = [];

  for (const table of tables) {
    const columns = await db.all<TableColumnInfo>(`PRAGMA table_info(${table});`);
    const countRow = await db.get<{ count: number }>(`SELECT COUNT(*) as count FROM ${table};`);
    const sampleData = await db.all<Record<string, unknown>>(`SELECT * FROM ${table} ORDER BY id ASC LIMIT 3;`);

    metadataList.push({
      tableName: table,
      columns,
      rowCount: countRow?.count ?? 0,
      sampleData,
    });
  }

  return metadataList;
}

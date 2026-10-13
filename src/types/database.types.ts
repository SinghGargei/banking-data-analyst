export interface Application {
  id: number;
  month: string;
  segment: string;
  count: number;
  created_at?: string;
}

export interface ApplicationInput {
  month: string;
  segment: string;
  count: number;
}

export interface Branch {
  id: number;
  name: string;
  rejection_rate: number;
  created_at?: string;
}

export interface BranchInput {
  name: string;
  rejection_rate: number;
}

export interface Customer {
  id: number;
  name: string;
  transaction_value: number;
  created_at?: string;
}

export interface CustomerInput {
  name: string;
  transaction_value: number;
}

export interface RunResult {
  lastID: number;
  changes: number;
}

export interface DatasetStats {
  applicationsCount: number;
  branchesCount: number;
  customersCount: number;
  totalTransactionVolume: number;
  averageRejectionRate: number;
}

export interface TableColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

export interface SchemaMetadata {
  tableName: string;
  columns: TableColumnInfo[];
  rowCount: number;
  sampleData: Record<string, unknown>[];
}

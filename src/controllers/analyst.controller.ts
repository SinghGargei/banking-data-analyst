import { Request, Response, NextFunction } from 'express';
import { db } from '../db/connection';
import { getDatabaseSchemaMetadata } from '../db/schema';
import { ApiResponse, AppError } from '../types/express.types';

export async function getSchema(
  _req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const schema = await getDatabaseSchemaMetadata();
    res.status(200).json({
      success: true,
      data: {
        database: 'banking.db',
        description: 'Banking analytical database containing applications, branches, and customer portfolios',
        tables: schema,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

export async function getOverview(
  _req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const [appStats, branchStats, custStats] = await Promise.all([
      db.get<{ total_applications: number; unique_months: number; unique_segments: number }>(`
        SELECT 
          SUM(count) as total_applications,
          COUNT(DISTINCT month) as unique_months,
          COUNT(DISTINCT segment) as unique_segments
        FROM applications;
      `),
      db.get<{ total_branches: number; avg_rejection_rate: number }>(`
        SELECT 
          COUNT(*) as total_branches,
          ROUND(AVG(rejection_rate), 4) as avg_rejection_rate
        FROM branches;
      `),
      db.get<{ total_customers: number; total_volume: number; avg_transaction: number }>(`
        SELECT 
          COUNT(*) as total_customers,
          ROUND(SUM(transaction_value), 2) as total_volume,
          ROUND(AVG(transaction_value), 2) as avg_transaction
        FROM customers;
      `),
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: 'Executive overview for Banking Conversational Data Analyst',
        applications: appStats,
        branches: branchStats,
        customers: custStats,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Executes a strictly validated, read-only SQL query for the conversational data analyst agent
 */
export async function executeSafeQuery(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { query } = req.body as { query?: string };

    if (!query || typeof query !== 'string' || query.trim() === '') {
      throw new AppError('A valid SQL query string must be provided in the request body.', 400);
    }

    const trimmedQuery = query.trim();

    // Enforce read-only constraint: query must start with SELECT or WITH
    const isReadOnly = /^(SELECT|WITH)\b/i.test(trimmedQuery);
    if (!isReadOnly) {
      throw new AppError(
        'Security policy violation: Only read-only SELECT queries are permitted by the conversational analyst interface.',
        403
      );
    }

    // Check against forbidden destructive or PRAGMA commands
    const forbiddenKeywords = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|ATTACH|DETACH|PRAGMA|REINDEX|VACUUM)\b/i;
    if (forbiddenKeywords.test(trimmedQuery)) {
      throw new AppError(
        'Security policy violation: Detected mutating or privileged SQL keywords in query.',
        403
      );
    }

    // Disallow multiple statements separated by semicolon
    const statements = trimmedQuery.split(';').filter((stmt) => stmt.trim().length > 0);
    if (statements.length > 1) {
      throw new AppError('Multiple SQL statements are not allowed.', 400);
    }

    const startTime = Date.now();
    const rows = await db.all<Record<string, unknown>>(trimmedQuery);
    const executionTimeMs = Date.now() - startTime;

    res.status(200).json({
      success: true,
      data: rows,
      meta: {
        rowCount: rows.length,
        executionTimeMs,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

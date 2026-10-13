import { Request, Response, NextFunction } from 'express';
import { db } from '../db/connection';
import { Customer } from '../types/database.types';
import { ApiResponse, AppError } from '../types/express.types';

export async function getCustomers(
  req: Request,
  res: Response<ApiResponse<Customer[]>>,
  next: NextFunction
): Promise<void> {
  try {
    const { 
      minTransaction, 
      sortBy = 'transaction_value', 
      order = 'desc', 
      limit = '100', 
      offset = '0' 
    } = req.query;

    const allowedSortFields = ['id', 'name', 'transaction_value'];
    const sortField = allowedSortFields.includes(String(sortBy)) ? String(sortBy) : 'transaction_value';
    const sortOrder = String(order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const parsedLimit = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 500);
    const parsedOffset = Math.max(parseInt(String(offset), 10) || 0, 0);

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (minTransaction !== undefined) {
      const parsedMin = parseFloat(String(minTransaction));
      if (!isNaN(parsedMin)) {
        conditions.push('transaction_value >= ?');
        params.push(parsedMin);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const totalRow = await db.get<{ total: number }>(
      `SELECT COUNT(*) as total FROM customers ${whereClause};`,
      params
    );

    const query = `
      SELECT id, name, transaction_value, created_at 
      FROM customers 
      ${whereClause} 
      ORDER BY ${sortField} ${sortOrder} 
      LIMIT ? OFFSET ?;
    `;
    const customers = await db.all<Customer>(query, [...params, parsedLimit, parsedOffset]);

    res.status(200).json({
      success: true,
      data: customers,
      meta: {
        total: totalRow?.total ?? 0,
        limit: parsedLimit,
        offset: parsedOffset,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getCustomerById(
  req: Request,
  res: Response<ApiResponse<Customer>>,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const customer = await db.get<Customer>(
      'SELECT id, name, transaction_value, created_at FROM customers WHERE id = ?;',
      [id]
    );

    if (!customer) {
      throw new AppError(`Customer record with ID ${id} not found`, 404);
    }

    res.status(200).json({
      success: true,
      data: customer,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

export async function getCustomerStats(
  _req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const stats = await db.get<{
      total_customers: number;
      total_volume: number;
      avg_transaction_value: number;
      max_transaction_value: number;
      min_transaction_value: number;
    }>(`
      SELECT 
        COUNT(*) as total_customers,
        ROUND(SUM(transaction_value), 2) as total_volume,
        ROUND(AVG(transaction_value), 2) as avg_transaction_value,
        ROUND(MAX(transaction_value), 2) as max_transaction_value,
        ROUND(MIN(transaction_value), 2) as min_transaction_value
      FROM customers;
    `);

    const topTierClients = await db.all<Customer>(`
      SELECT id, name, transaction_value 
      FROM customers 
      ORDER BY transaction_value DESC 
      LIMIT 5;
    `);

    res.status(200).json({
      success: true,
      data: {
        metrics: stats,
        topClients: topTierClients,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

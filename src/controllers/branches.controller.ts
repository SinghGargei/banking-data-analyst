import { Request, Response, NextFunction } from 'express';
import { db } from '../db/connection';
import { Branch } from '../types/database.types';
import { ApiResponse, AppError } from '../types/express.types';

export async function getBranches(
  req: Request,
  res: Response<ApiResponse<Branch[]>>,
  next: NextFunction
): Promise<void> {
  try {
    const { sortBy = 'rejection_rate', order = 'asc', limit = '100', offset = '0' } = req.query;

    const allowedSortFields = ['id', 'name', 'rejection_rate'];
    const sortField = allowedSortFields.includes(String(sortBy)) ? String(sortBy) : 'rejection_rate';
    const sortOrder = String(order).toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    const parsedLimit = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 500);
    const parsedOffset = Math.max(parseInt(String(offset), 10) || 0, 0);

    const totalRow = await db.get<{ total: number }>('SELECT COUNT(*) as total FROM branches;');

    const query = `
      SELECT id, name, rejection_rate, created_at 
      FROM branches 
      ORDER BY ${sortField} ${sortOrder} 
      LIMIT ? OFFSET ?;
    `;
    const branches = await db.all<Branch>(query, [parsedLimit, parsedOffset]);

    res.status(200).json({
      success: true,
      data: branches,
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

export async function getBranchById(
  req: Request,
  res: Response<ApiResponse<Branch>>,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const branch = await db.get<Branch>(
      'SELECT id, name, rejection_rate, created_at FROM branches WHERE id = ?;',
      [id]
    );

    if (!branch) {
      throw new AppError(`Branch with ID ${id} not found`, 404);
    }

    res.status(200).json({
      success: true,
      data: branch,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

export async function getBranchStats(
  _req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const stats = await db.get<{
      total_branches: number;
      avg_rejection_rate: number;
      min_rejection_rate: number;
      max_rejection_rate: number;
    }>(`
      SELECT 
        COUNT(*) as total_branches,
        ROUND(AVG(rejection_rate), 4) as avg_rejection_rate,
        MIN(rejection_rate) as min_rejection_rate,
        MAX(rejection_rate) as max_rejection_rate
      FROM branches;
    `);

    const topHighestRejections = await db.all<Branch>(`
      SELECT id, name, rejection_rate 
      FROM branches 
      ORDER BY rejection_rate DESC 
      LIMIT 3;
    `);

    const topLowestRejections = await db.all<Branch>(`
      SELECT id, name, rejection_rate 
      FROM branches 
      ORDER BY rejection_rate ASC 
      LIMIT 3;
    `);

    res.status(200).json({
      success: true,
      data: {
        overview: stats,
        highestRejectionBranches: topHighestRejections,
        lowestRejectionBranches: topLowestRejections,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

import { Request, Response, NextFunction } from 'express';
import { db } from '../db/connection';
import { Application } from '../types/database.types';
import { ApiResponse, AppError } from '../types/express.types';

export async function getApplications(
  req: Request,
  res: Response<ApiResponse<Application[]>>,
  next: NextFunction
): Promise<void> {
  try {
    const { month, segment, limit = '100', offset = '0' } = req.query;

    const parsedLimit = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 500);
    const parsedOffset = Math.max(parseInt(String(offset), 10) || 0, 0);

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (month && typeof month === 'string') {
      conditions.push('month = ?');
      params.push(month);
    }

    if (segment && typeof segment === 'string') {
      conditions.push('segment = ?');
      params.push(segment);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) as total FROM applications ${whereClause};`;
    const totalRow = await db.get<{ total: number }>(countQuery, params);

    const query = `
      SELECT id, month, segment, count, created_at 
      FROM applications 
      ${whereClause} 
      ORDER BY month ASC, count DESC 
      LIMIT ? OFFSET ?;
    `;
    const applications = await db.all<Application>(query, [...params, parsedLimit, parsedOffset]);

    res.status(200).json({
      success: true,
      data: applications,
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

export async function getApplicationById(
  req: Request,
  res: Response<ApiResponse<Application>>,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const application = await db.get<Application>(
      'SELECT id, month, segment, count, created_at FROM applications WHERE id = ?;',
      [id]
    );

    if (!application) {
      throw new AppError(`Application record with ID ${id} not found`, 404);
    }

    res.status(200).json({
      success: true,
      data: application,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

export async function getApplicationsSummary(
  _req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const segmentSummary = await db.all<{ segment: string; total_applications: number; avg_count: number }>(`
      SELECT 
        segment, 
        SUM(count) as total_applications, 
        ROUND(AVG(count), 2) as avg_count 
      FROM applications 
      GROUP BY segment 
      ORDER BY total_applications DESC;
    `);

    const monthlySummary = await db.all<{ month: string; total_applications: number }>(`
      SELECT 
        month, 
        SUM(count) as total_applications 
      FROM applications 
      GROUP BY month 
      ORDER BY month ASC;
    `);

    res.status(200).json({
      success: true,
      data: {
        bySegment: segmentSummary,
        byMonth: monthlySummary,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

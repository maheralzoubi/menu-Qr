import { Request, Response, NextFunction } from 'express';
import { getAnalytics } from '../services/analyticsService';

export const getAnalyticsData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    res.json(await getAnalytics(days));
  } catch (e) { next(e); }
};

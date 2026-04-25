import { Response, NextFunction } from 'express';
import { getAnalytics } from '../services/analyticsService';
import { AuthRequest } from '../middleware/auth';

export const getAnalyticsData = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const days = parseInt(req.query.days as string) || 30;
    res.json(await getAnalytics(restaurantId, days));
  } catch (e) { next(e); }
};

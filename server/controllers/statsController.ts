import { Response, NextFunction } from 'express';
import { getStats as fetchStats } from '../services/statsService';
import { AuthRequest } from '../middleware/auth';

export const getStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    res.json(await fetchStats(restaurantId));
  } catch (e) { next(e); }
};

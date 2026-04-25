import { Request, Response, NextFunction } from 'express';
import { getStats as fetchStats } from '../services/statsService';

export const getStats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await fetchStats());
  } catch (e) { next(e); }
};

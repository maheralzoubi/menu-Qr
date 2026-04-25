import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Restaurant } from '../models/Restaurant';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string; restaurantId?: string };
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as {
      id: string; email: string; role: string; restaurantId?: string;
    };

    // If admin/staff, verify their restaurant is still active
    if (payload.restaurantId) {
      const restaurant = await Restaurant.findById(payload.restaurantId).select('status');
      if (!restaurant || restaurant.status === 'inactive') {
        res.status(403).json({ message: 'Restaurant account is inactive. Please contact the platform owner.' });
        return;
      }
    }

    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Decodes JWT when present, but never rejects — used on public routes that also serve admins
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) { next(); return; }
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_SECRET) as {
      id: string; email: string; role: string; restaurantId?: string;
    };
    req.user = payload;
  } catch { /* invalid token — ignore, treat as unauthenticated */ }
  next();
}

export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) { res.status(401).json({ message: 'Unauthorized' }); return; }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { id: string; email: string; role: string };
    if (payload.role !== 'superadmin') {
      res.status(403).json({ message: 'Forbidden: owner access only' });
      return;
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Restaurant } from '../models/Restaurant';
import { User } from '../models/User';

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

// Allows both superadmin (platform owner) and owner (subscribers) roles.
// Also blocks accounts that have been locked by superAdmin.
export async function requireOwnerAccess(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) { res.status(401).json({ message: 'Unauthorized' }); return; }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { id: string; email: string; role: string };
    if (payload.role !== 'superadmin' && payload.role !== 'owner') {
      res.status(403).json({ message: 'Forbidden: owner panel access only' });
      return;
    }
    // Check that the account has not been locked
    if (payload.role === 'owner') {
      const user = await User.findById(payload.id).select('status');
      if (!user || user.status === 'locked') {
        res.status(403).json({ message: 'Your account has been locked. Please contact support.' });
        return;
      }
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

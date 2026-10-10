import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AppUserRequest extends Request {
  appUser?: { id: string; email: string; role: 'app_user' };
}

export function readAppUser(req: Request): AppUserRequest['appUser'] | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_SECRET) as { id: string; email: string; role: string };
    if (payload.role !== 'app_user') return undefined;
    return { id: payload.id, email: payload.email, role: 'app_user' };
  } catch {
    return undefined;
  }
}

export function requireAppUser(req: AppUserRequest, res: Response, next: NextFunction) {
  const user = readAppUser(req);
  if (!user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  req.appUser = user;
  next();
}

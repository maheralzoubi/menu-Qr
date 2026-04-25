import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Customer } from '../models/Customer';
import { Restaurant } from '../models/Restaurant';

export interface CustomerRequest extends Request {
  customer?: { id: string; email: string; role: string; restaurantId: string };
}

export async function requireCustomer(req: CustomerRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as {
      id: string; email: string; role: string; restaurantId: string;
    };
    if (payload.role !== 'customer') {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    // Block locked accounts
    const customer = await Customer.findById(payload.id).select('status');
    if (!customer || customer.status === 'locked') {
      res.status(403).json({ message: 'Account is locked. Please contact support.' });
      return;
    }

    // Block if restaurant is inactive
    const restaurant = await Restaurant.findById(payload.restaurantId).select('status');
    if (!restaurant || restaurant.status === 'inactive') {
      res.status(403).json({ message: 'This restaurant is currently unavailable.' });
      return;
    }

    req.customer = payload;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

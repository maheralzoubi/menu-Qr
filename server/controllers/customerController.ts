import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Customer } from '../models/Customer';
import { Restaurant } from '../models/Restaurant';
import { env } from '../config/env';
import { CustomerRequest } from '../middleware/customerAuth';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, phone, restaurantId } = req.body;
    if (!restaurantId) { res.status(400).json({ message: 'restaurantId is required' }); return; }

    const restaurant = await Restaurant.findById(restaurantId).select('status');
    if (!restaurant || restaurant.status === 'inactive') {
      res.status(403).json({ message: 'This restaurant is currently unavailable.' });
      return;
    }

    const existing = await Customer.findOne({ email, restaurantId });
    if (existing) { res.status(409).json({ message: 'Email already registered at this restaurant' }); return; }

    const customer = await Customer.create({ name, email, password, phone, restaurantId });
    const token = jwt.sign(
      { id: customer._id, email: customer.email, role: 'customer', restaurantId: restaurantId.toString() },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );
    res.status(201).json({ token, customer: { id: customer._id, name: customer.name, email: customer.email, restaurantId } });
  } catch (e) { next(e); }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, restaurantId } = req.body;
    if (!restaurantId) { res.status(400).json({ message: 'restaurantId is required' }); return; }

    const restaurant = await Restaurant.findById(restaurantId).select('status');
    if (!restaurant || restaurant.status === 'inactive') {
      res.status(403).json({ message: 'This restaurant is currently unavailable.' });
      return;
    }

    const customer = await Customer.findOne({ email, restaurantId });
    if (!customer || !(await customer.comparePassword(password))) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }
    if (customer.status === 'locked') {
      res.status(403).json({ message: 'Account is locked. Please contact support.' });
      return;
    }
    const token = jwt.sign(
      { id: customer._id, email: customer.email, role: 'customer', restaurantId: restaurantId.toString() },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );
    res.json({ token, customer: { id: customer._id, name: customer.name, email: customer.email, status: customer.status, restaurantId } });
  } catch (e) { next(e); }
};

export const getMe = async (req: CustomerRequest, res: Response, next: NextFunction) => {
  try {
    const customer = await Customer.findById(req.customer!.id).select('-password');
    if (!customer) { res.status(404).json({ message: 'Not found' }); return; }
    res.json(customer);
  } catch (e) { next(e); }
};

export const updateMe = async (req: CustomerRequest, res: Response, next: NextFunction) => {
  try {
    const { name, phone } = req.body;
    const customer = await Customer.findByIdAndUpdate(
      req.customer!.id,
      { ...(name && { name }), ...(phone !== undefined && { phone }) },
      { new: true, runValidators: true }
    ).select('-password');
    res.json(customer);
  } catch (e) { next(e); }
};

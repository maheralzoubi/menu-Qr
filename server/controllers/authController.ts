import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { env } from '../config/env';
import { AuthRequest } from '../middleware/auth';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    // Block admin login if their restaurant is inactive
    if (user.restaurantId) {
      const restaurant = await Restaurant.findById(user.restaurantId).select('status');
      if (!restaurant || restaurant.status === 'inactive') {
        res.status(403).json({ message: 'Restaurant account is inactive. Please contact the platform owner.' });
        return;
      }
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, restaurantId: user.restaurantId?.toString() },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );
    res.json({
      token,
      user: {
        id: user._id, email: user.email, role: user.role,
        name: user.name, title: user.title, avatar: user.avatar,
        restaurantId: user.restaurantId,
      },
    });
  } catch (e) { next(e); }
};

export const logout = (_req: Request, res: Response) => {
  res.json({ message: 'Logged out' });
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!.id).select('-password');
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    res.json(user);
  } catch (e) { next(e); }
};

export const updateMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, phone, title, avatar, password } = req.body;
    const user = await User.findById(req.user!.id);
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (title !== undefined) user.title = title;
    if (avatar !== undefined) user.avatar = avatar;
    if (password) user.password = password;
    await user.save();
    const { password: _, ...safe } = user.toObject();
    res.json(safe);
  } catch (e) { next(e); }
};

// Called after Stripe payment confirms — verifies subscription then creates owner account
export const subscribe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, restaurantName, plan, billing, subscriptionId } = req.body;
    if (!name?.trim() || !email?.trim() || !password || !restaurantName?.trim() || !plan) {
      res.status(400).json({ message: 'All fields are required.' });
      return;
    }
    const validPlans = ['starter', 'pro', 'enterprise'];
    if (!validPlans.includes(plan)) {
      res.status(400).json({ message: 'Invalid plan selected.' });
      return;
    }
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      res.status(409).json({ message: 'An account with this email already exists.' });
      return;
    }

    // Verify the Stripe subscription is active before creating the account
    let stripeCustomerId: string | undefined;
    let stripeSubscriptionId: string | undefined;
    if (subscriptionId) {
      const { stripe } = await import('../services/stripe.js');
      if (stripe) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId).catch(() => null);
        if (!sub || !['active', 'trialing'].includes(sub.status)) {
          res.status(402).json({ message: 'Payment was not completed successfully.' });
          return;
        }
        stripeCustomerId    = sub.customer as string;
        stripeSubscriptionId = sub.id;
      }
    }

    await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      restaurantName: restaurantName.trim(),
      role: 'owner',
      plan,
      planBilling: billing ?? 'monthly',
      planActivatedAt: new Date(),
      planStatus: 'active',
      stripeCustomerId,
      stripeSubscriptionId,
    });
    res.status(201).json({ message: 'Account created successfully. You can now log in.', email });
  } catch (e) { next(e); }
};

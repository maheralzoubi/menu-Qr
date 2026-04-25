import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
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
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );
    res.json({
      token,
      user: { id: user._id, email: user.email, role: user.role, name: user.name, title: user.title, avatar: user.avatar },
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

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { AppUser } from '../models/AppUser';
import { Order } from '../models/Order';
import { env } from '../config/env';
import { sendLoginCode } from '../services/emailService';
import { AppUserRequest } from '../middleware/appUserAuth';

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function publicUser(u: { _id: unknown; email: string; name?: string; addresses: unknown[] }) {
  return { id: u._id, email: u.email, name: u.name ?? '', addresses: u.addresses };
}

export const requestCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      res.status(400).json({ code: 'INVALID_EMAIL', message: 'Enter a valid email address.' });
      return;
    }

    const user = (await AppUser.findOne({ email })) ?? new AppUser({ email });
    if (user.loginCodeSentAt && Date.now() - user.loginCodeSentAt.getTime() < RESEND_COOLDOWN_MS) {
      res.status(429).json({ code: 'TOO_SOON', message: 'Please wait a moment before requesting another code.' });
      return;
    }

    const code = String(crypto.randomInt(0, 10_000)).padStart(4, '0');
    user.loginCodeHash = hashCode(code);
    user.loginCodeExpires = new Date(Date.now() + CODE_TTL_MS);
    user.loginCodeSentAt = new Date();
    user.loginAttempts = 0;
    await user.save();
    try {
      await sendLoginCode(email, code, req.body?.lang === 'ar' ? 'ar' : 'en');
    } catch (err) {
      // Let the user retry straight away instead of waiting out the resend cooldown.
      user.loginCodeSentAt = undefined;
      await user.save();
      throw err;
    }

    res.json({ ok: true });
  } catch (e) { next(e); }
};

export const verifyCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const code = String(req.body?.code ?? '').trim();
    const user = await AppUser.findOne({ email });

    if (!user?.loginCodeHash || !user.loginCodeExpires) {
      res.status(400).json({ code: 'INVALID_CODE', message: 'Incorrect code. Try again.' });
      return;
    }
    if (user.loginCodeExpires.getTime() < Date.now()) {
      res.status(400).json({ code: 'EXPIRED_CODE', message: 'This code has expired. Request a new one.' });
      return;
    }
    if (user.loginAttempts >= MAX_ATTEMPTS) {
      res.status(400).json({ code: 'TOO_MANY_ATTEMPTS', message: 'Too many attempts. Request a new code.' });
      return;
    }
    if (hashCode(code) !== user.loginCodeHash) {
      user.loginAttempts += 1;
      await user.save();
      res.status(400).json({ code: 'INVALID_CODE', message: 'Incorrect code. Try again.' });
      return;
    }

    user.loginCodeHash = undefined;
    user.loginCodeExpires = undefined;
    user.loginAttempts = 0;
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email, role: 'app_user' },
      env.JWT_SECRET,
      { expiresIn: '90d' }
    );
    res.json({ token, user: publicUser(user) });
  } catch (e) { next(e); }
};

export const getMe = async (req: AppUserRequest, res: Response, next: NextFunction) => {
  try {
    const user = await AppUser.findById(req.appUser!.id);
    if (!user) { res.status(404).json({ message: 'Not found' }); return; }
    res.json(publicUser(user));
  } catch (e) { next(e); }
};

export const updateMe = async (req: AppUserRequest, res: Response, next: NextFunction) => {
  try {
    const update: Record<string, unknown> = {};
    if (typeof req.body?.name === 'string') update.name = req.body.name.trim().slice(0, 80);
    if (Array.isArray(req.body?.addresses)) {
      update.addresses = req.body.addresses
        .filter((a: any) => a && typeof a.line === 'string' && a.line.trim())
        .slice(0, 10)
        .map((a: any) => ({
          id: String(a.id || crypto.randomUUID()),
          label: String(a.label ?? '').trim().slice(0, 40),
          line: String(a.line).trim().slice(0, 200),
        }));
    }
    const user = await AppUser.findByIdAndUpdate(req.appUser!.id, update, { returnDocument: 'after', runValidators: true });
    if (!user) { res.status(404).json({ message: 'Not found' }); return; }
    res.json(publicUser(user));
  } catch (e) { next(e); }
};

export const getMyOrders = async (req: AppUserRequest, res: Response, next: NextFunction) => {
  try {
    const orders = await Order.find({ customerEmail: req.appUser!.email }).sort({ createdAt: -1 }).limit(50);
    res.json(orders);
  } catch (e) { next(e); }
};

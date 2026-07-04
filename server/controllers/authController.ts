import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { env } from '../config/env';
import { AuthRequest } from '../middleware/auth';
import { sendVerificationCode, sendPasswordResetCode } from '../services/emailService';

const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function generateCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

async function issueVerificationCode(email: string): Promise<void> {
  const code = generateCode();
  await User.updateOne(
    { email },
    {
      verificationCodeHash: hashCode(code),
      verificationCodeExpires: new Date(Date.now() + CODE_TTL_MS),
      verificationAttempts: 0,
    }
  );
  await sendVerificationCode(email, code);
}

async function issueResetCode(email: string): Promise<void> {
  const code = generateCode();
  await User.updateOne(
    { email },
    {
      resetCodeHash: hashCode(code),
      resetCodeExpires: new Date(Date.now() + CODE_TTL_MS),
      resetAttempts: 0,
    }
  );
  await sendPasswordResetCode(email, code);
}

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
      return;
    }

    if (user.role === 'owner' && !user.emailVerified) {
      res.status(403).json({ code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email address before signing in.' });
      return;
    }

    // Block admin login if their restaurant is inactive
    if (user.restaurantId) {
      const restaurant = await Restaurant.findById(user.restaurantId).select('status');
      if (!restaurant || restaurant.status === 'inactive') {
        res.status(403).json({ code: 'RESTAURANT_INACTIVE', message: 'Restaurant account is inactive. Please contact the platform owner.' });
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

    const normalizedEmail = email.toLowerCase().trim();
    await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      restaurantName: restaurantName.trim(),
      role: 'owner',
      plan,
      planBilling: billing ?? 'monthly',
      planActivatedAt: new Date(),
      planStatus: 'active',
      stripeCustomerId,
      stripeSubscriptionId,
      emailVerified: false,
    });
    await issueVerificationCode(normalizedEmail);
    res.status(201).json({ message: 'Account created. Check your email for a verification code.', email });
  } catch (e) { next(e); }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, code } = req.body;
    if (!email?.trim() || !code || typeof code !== 'string') {
      res.status(400).json({ code: 'INVALID_CODE', message: 'Please enter the verification code.' });
      return;
    }
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail, role: 'owner' });
    if (!user || !user.verificationCodeHash) {
      res.status(400).json({ code: 'INVALID_CODE', message: 'Invalid verification code.' });
      return;
    }
    if (!user.verificationCodeExpires || user.verificationCodeExpires < new Date()) {
      res.status(400).json({ code: 'EXPIRED_CODE', message: 'This code has expired. Please request a new one.' });
      return;
    }
    if (user.verificationAttempts >= MAX_CODE_ATTEMPTS) {
      user.verificationCodeHash = undefined;
      user.verificationCodeExpires = undefined;
      await user.save();
      res.status(400).json({ code: 'TOO_MANY_ATTEMPTS', message: 'Too many incorrect attempts. Please request a new code.' });
      return;
    }
    if (hashCode(code) !== user.verificationCodeHash) {
      user.verificationAttempts += 1;
      await user.save();
      res.status(400).json({ code: 'INVALID_CODE', message: 'Incorrect code. Please try again.' });
      return;
    }
    user.emailVerified = true;
    user.verificationCodeHash = undefined;
    user.verificationCodeExpires = undefined;
    user.verificationAttempts = 0;
    await user.save();
    res.json({ message: 'Email verified. You can now sign in.' });
  } catch (e) { next(e); }
};

export const resendVerification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (email?.trim()) {
      const normalizedEmail = email.toLowerCase().trim();
      const user = await User.findOne({ email: normalizedEmail, role: 'owner', emailVerified: false });
      if (user) await issueVerificationCode(normalizedEmail);
    }
    // Always respond the same way, regardless of whether the account exists, to avoid leaking which emails are registered.
    res.json({ message: 'If that account needs verification, a new code has been sent.' });
  } catch (e) { next(e); }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email?.trim()) {
      res.status(400).json({ code: 'EMAIL_NOT_FOUND', message: 'No account found with this email.' });
      return;
    }
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      res.status(404).json({ code: 'EMAIL_NOT_FOUND', message: 'No account found with this email.' });
      return;
    }
    await issueResetCode(normalizedEmail);
    res.json({ message: 'A password reset code has been sent to your email.' });
  } catch (e) { next(e); }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email?.trim() || !code || typeof code !== 'string') {
      res.status(400).json({ code: 'INVALID_CODE', message: 'Please enter the reset code.' });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ code: 'WEAK_PASSWORD', message: 'Password must be at least 6 characters.' });
      return;
    }
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !user.resetCodeHash) {
      res.status(400).json({ code: 'INVALID_CODE', message: 'Invalid reset code.' });
      return;
    }
    if (!user.resetCodeExpires || user.resetCodeExpires < new Date()) {
      res.status(400).json({ code: 'EXPIRED_CODE', message: 'This code has expired. Please request a new one.' });
      return;
    }
    if (user.resetAttempts >= MAX_CODE_ATTEMPTS) {
      user.resetCodeHash = undefined;
      user.resetCodeExpires = undefined;
      await user.save();
      res.status(400).json({ code: 'TOO_MANY_ATTEMPTS', message: 'Too many incorrect attempts. Please request a new code.' });
      return;
    }
    if (hashCode(code) !== user.resetCodeHash) {
      user.resetAttempts += 1;
      await user.save();
      res.status(400).json({ code: 'INVALID_CODE', message: 'Incorrect code. Please try again.' });
      return;
    }
    user.password = newPassword;
    user.resetCodeHash = undefined;
    user.resetCodeExpires = undefined;
    user.resetAttempts = 0;
    await user.save();
    res.json({ message: 'Password reset. You can now sign in with your new password.' });
  } catch (e) { next(e); }
};

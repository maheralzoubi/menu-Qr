import { Request, Response, NextFunction } from 'express';
import { Banner } from '../models/Banner';

export const getPublicBanners = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const banners = await Banner.find({ isActive: true }).sort({ sortOrder: 1 });
    res.json(banners);
  } catch (e) { next(e); }
};

export const getAdminBanners = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const banners = await Banner.find().sort({ sortOrder: 1 });
    res.json(banners);
  } catch (e) { next(e); }
};

export const createBanner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, subtitle, emoji, isActive, sortOrder } = req.body;
    if (!title?.trim()) { res.status(400).json({ message: 'Title is required' }); return; }
    const banner = await Banner.create({ title: title.trim(), subtitle: subtitle?.trim() ?? '', emoji: emoji?.trim() || '🛍️', isActive: isActive ?? true, sortOrder: sortOrder ?? 0 });
    res.status(201).json(banner);
  } catch (e) { next(e); }
};

export const updateBanner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, subtitle, emoji, isActive, sortOrder } = req.body;
    const update: Record<string, unknown> = {};
    if (title     !== undefined) update.title     = title.trim();
    if (subtitle  !== undefined) update.subtitle  = subtitle.trim();
    if (emoji     !== undefined) update.emoji     = emoji.trim() || '🛍️';
    if (isActive  !== undefined) update.isActive  = Boolean(isActive);
    if (sortOrder !== undefined) update.sortOrder = Number(sortOrder);
    const banner = await Banner.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!banner) { res.status(404).json({ message: 'Banner not found' }); return; }
    res.json(banner);
  } catch (e) { next(e); }
};

export const deleteBanner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const banner = await Banner.findByIdAndDelete(id);
    if (!banner) { res.status(404).json({ message: 'Banner not found' }); return; }
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
};

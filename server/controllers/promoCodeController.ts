import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as promoCodeService from '../services/promoCodeService';

export const getPromoCodes = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    res.json(await promoCodeService.getPromoCodes(restaurantId));
  } catch (e) { next(e); }
};

export const createPromoCode = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const promo = await promoCodeService.createPromoCode(req.body, restaurantId);
    res.status(201).json(promo);
  } catch (e: any) {
    if (e.code === 11000) {
      res.status(409).json({ message: 'A promo code with this name already exists' });
      return;
    }
    next(e);
  }
};

export const deletePromoCode = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const deleted = await promoCodeService.deletePromoCode(req.params.id, restaurantId);
    if (!deleted) { res.status(404).json({ message: 'Promo code not found' }); return; }
    res.status(204).send();
  } catch (e) { next(e); }
};

export const togglePromoCode = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const promo = await promoCodeService.togglePromoCode(req.params.id, restaurantId, req.body.isActive);
    if (!promo) { res.status(404).json({ message: 'Promo code not found' }); return; }
    res.json(promo);
  } catch (e) { next(e); }
};

export const validatePromoCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, restaurantId, subtotal } = req.body;
    const result = await promoCodeService.validatePromoCode(code, restaurantId, subtotal);
    res.json(result);
  } catch (e) { next(e); }
};

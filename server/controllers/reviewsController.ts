import { Request, Response, NextFunction } from 'express';
import * as reviewsService from '../services/reviewsService';
import { AuthRequest } from '../middleware/auth';
import { getIO } from '../socket/index';

export const getReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Accept explicit query param (customer app) or fall back to the authenticated admin's restaurant
    const restaurantId =
      (req.query.restaurantId as string) ||
      (req as AuthRequest).user?.restaurantId ||
      '';
    if (!restaurantId) { res.status(400).json({ message: 'restaurantId is required' }); return; }
    res.json(await reviewsService.getReviews(restaurantId));
  } catch (e) { next(e); }
};

export const postReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const review = await reviewsService.createReview({ ...req.body, date: 'Just now' });
    getIO().to('admin').emit('review:new', review);
    res.status(201).json(review);
  } catch (e) { next(e); }
};

export const deleteReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const deleted = await reviewsService.deleteReview(req.params.id, restaurantId);
    if (!deleted) { res.status(404).json({ message: 'Review not found' }); return; }
    res.status(204).send();
  } catch (e) { next(e); }
};

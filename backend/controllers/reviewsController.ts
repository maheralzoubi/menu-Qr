import { Request, Response, NextFunction } from 'express';
import * as reviewsService from '../services/reviewsService';
import { getIO } from '../socket/index';

export const getReviews = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await reviewsService.getReviews());
  } catch (e) { next(e); }
};

export const postReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const review = await reviewsService.createReview({ ...req.body, date: 'Just now' });
    getIO().to('admin').emit('review:new', review);
    res.status(201).json(review);
  } catch (e) { next(e); }
};

export const deleteReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await reviewsService.deleteReview(req.params.id);
    if (!deleted) { res.status(404).json({ message: 'Review not found' }); return; }
    res.status(204).send();
  } catch (e) { next(e); }
};

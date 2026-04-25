import { Response, NextFunction } from 'express';
import * as categoriesService from '../services/categoriesService';
import { AuthRequest } from '../middleware/auth';

const getRestaurantId = (req: AuthRequest): string =>
  req.user?.restaurantId ?? (req.query.restaurantId as string) ?? '';

export const getCategories = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = getRestaurantId(req);
    if (!restaurantId) { res.status(400).json({ message: 'restaurantId is required' }); return; }
    res.json(await categoriesService.getCategories(restaurantId));
  } catch (e) { next(e); }
};

export const postCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const cat = await categoriesService.createCategory({ ...req.body, restaurantId });
    res.status(201).json(cat);
  } catch (e) { next(e); }
};

export const patchCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const cat = await categoriesService.updateCategory(req.params.id, restaurantId, req.body);
    if (!cat) { res.status(404).json({ message: 'Category not found' }); return; }
    res.json(cat);
  } catch (e) { next(e); }
};

export const deleteCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const deleted = await categoriesService.deleteCategory(req.params.id, restaurantId);
    if (!deleted) { res.status(404).json({ message: 'Category not found' }); return; }
    res.status(204).send();
  } catch (e) { next(e); }
};

import { Response, NextFunction } from 'express';
import * as menuService from '../services/menuService';
import { AuthRequest } from '../middleware/auth';

// Public: restaurantId from query param. Admin: from JWT.
const getRestaurantId = (req: AuthRequest): string =>
  req.user?.restaurantId ?? (req.query.restaurantId as string) ?? '';

export const getMenu = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = getRestaurantId(req);
    if (!restaurantId) { res.status(400).json({ message: 'restaurantId is required' }); return; }
    res.json(await menuService.getMenuItems(restaurantId));
  } catch (e) { next(e); }
};

export const getMenuItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const item = await menuService.getMenuItemById(req.params.id);
    if (!item) { res.status(404).json({ message: 'Item not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
};

export const postMenuItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const item = await menuService.createMenuItem({ ...req.body, restaurantId });
    res.status(201).json(item);
  } catch (e) { next(e); }
};

export const patchMenuItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const item = await menuService.updateMenuItem(req.params.id, restaurantId, req.body);
    if (!item) { res.status(404).json({ message: 'Item not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
};

export const deleteMenuItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const deleted = await menuService.deleteMenuItem(req.params.id, restaurantId);
    if (!deleted) { res.status(404).json({ message: 'Item not found' }); return; }
    res.status(204).send();
  } catch (e) { next(e); }
};

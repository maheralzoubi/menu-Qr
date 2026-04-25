import { Request, Response, NextFunction } from 'express';
import * as menuService from '../services/menuService';

export const getMenu = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await menuService.getMenuItems());
  } catch (e) { next(e); }
};

export const getMenuItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await menuService.getMenuItemById(req.params.id);
    if (!item) { res.status(404).json({ message: 'Item not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
};

export const postMenuItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await menuService.createMenuItem(req.body);
    res.status(201).json(item);
  } catch (e) { next(e); }
};

export const patchMenuItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await menuService.updateMenuItem(req.params.id, req.body);
    if (!item) { res.status(404).json({ message: 'Item not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
};

export const deleteMenuItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await menuService.deleteMenuItem(req.params.id);
    if (!deleted) { res.status(404).json({ message: 'Item not found' }); return; }
    res.status(204).send();
  } catch (e) { next(e); }
};

import { Request, Response, NextFunction } from 'express';
import * as tablesService from '../services/tablesService';
import { AuthRequest } from '../middleware/auth';

// Public — customer app uses restaurantId from query param
export const getTablesPublic = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.query.restaurantId as string;
    if (!restaurantId) { res.status(400).json({ message: 'restaurantId is required' }); return; }
    res.json(await tablesService.getTables(restaurantId));
  } catch (e) { next(e); }
};

// Admin — restaurantId from JWT
export const getTables = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    res.json(await tablesService.getTables(restaurantId));
  } catch (e) { next(e); }
};

export const createTable = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const { name } = req.body;
    if (!name) { res.status(400).json({ message: 'name is required' }); return; }
    const table = await tablesService.createTable({ name, restaurantId });
    res.status(201).json(table);
  } catch (e) { next(e); }
};

export const deleteTable = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const deleted = await tablesService.deleteTable(req.params.id, restaurantId);
    if (!deleted) { res.status(404).json({ message: 'Table not found' }); return; }
    res.status(204).send();
  } catch (e) { next(e); }
};

export const setManualStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const { status } = req.body; // 'occupied' | 'free' | null
    const table = await tablesService.setManualStatus(req.params.id, restaurantId, status ?? null);
    if (!table) { res.status(404).json({ message: 'Table not found' }); return; }
    res.json(table);
  } catch (e) { next(e); }
};

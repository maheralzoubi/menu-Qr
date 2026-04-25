import { Request, Response, NextFunction } from 'express';
import * as categoriesService from '../services/categoriesService';

export const getCategories = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await categoriesService.getCategories());
  } catch (e) { next(e); }
};

export const postCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cat = await categoriesService.createCategory(req.body);
    res.status(201).json(cat);
  } catch (e) { next(e); }
};

export const patchCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cat = await categoriesService.updateCategory(req.params.id, req.body);
    if (!cat) { res.status(404).json({ message: 'Category not found' }); return; }
    res.json(cat);
  } catch (e) { next(e); }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await categoriesService.deleteCategory(req.params.id);
    if (!deleted) { res.status(404).json({ message: 'Category not found' }); return; }
    res.status(204).send();
  } catch (e) { next(e); }
};

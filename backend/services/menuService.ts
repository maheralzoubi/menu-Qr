import { MenuItem } from '../models/MenuItem';

export const getMenuItems = () => MenuItem.find().sort({ createdAt: -1 });

export const getMenuItemById = (id: string) => MenuItem.findById(id);

export const createMenuItem = (data: object) => MenuItem.create(data);

export const updateMenuItem = (id: string, data: object) =>
  MenuItem.findByIdAndUpdate(id, data, { new: true, runValidators: true });

export const deleteMenuItem = (id: string) => MenuItem.findByIdAndDelete(id);

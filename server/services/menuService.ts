import { MenuItem } from '../models/MenuItem';

export const getMenuItems = (restaurantId: string) =>
  MenuItem.find({ restaurantId }).sort({ createdAt: -1 });

export const getMenuItemById = (id: string) => MenuItem.findById(id);

export const createMenuItem = (data: object) => MenuItem.create(data);

export const updateMenuItem = (id: string, restaurantId: string, data: object) =>
  MenuItem.findOneAndUpdate({ _id: id, restaurantId }, data, { returnDocument: 'after', runValidators: true });

export const deleteMenuItem = (id: string, restaurantId: string) =>
  MenuItem.findOneAndDelete({ _id: id, restaurantId });

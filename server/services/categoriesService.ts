import { Category } from '../models/Category';

export const getCategories = (restaurantId: string) =>
  Category.find({ restaurantId }).sort({ createdAt: 1 });

export const createCategory = (data: object) => Category.create(data);

export const updateCategory = (id: string, restaurantId: string, data: object) =>
  Category.findOneAndUpdate({ _id: id, restaurantId }, data, { returnDocument: 'after', runValidators: true });

export const deleteCategory = (id: string, restaurantId: string) =>
  Category.findOneAndDelete({ _id: id, restaurantId });

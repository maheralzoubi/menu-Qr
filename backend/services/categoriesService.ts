import { Category } from '../models/Category';

export const getCategories = () => Category.find().sort({ createdAt: 1 });

export const getCategoryById = (id: string) => Category.findById(id);

export const createCategory = (data: object) => Category.create(data);

export const updateCategory = (id: string, data: object) =>
  Category.findByIdAndUpdate(id, data, { new: true, runValidators: true });

export const deleteCategory = (id: string) => Category.findByIdAndDelete(id);

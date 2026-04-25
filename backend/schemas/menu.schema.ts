import { z } from 'zod';

export const createMenuItemSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  price: z.number().min(0),
  description: z.string().default(''),
  longDescription: z.string().default(''),
  ingredients: z.array(z.string()).default([]),
  allergens: z.array(z.string()).default([]),
  image: z.string().default(''),
  featured: z.boolean().default(false),
});

export const updateMenuItemSchema = createMenuItemSchema.partial();

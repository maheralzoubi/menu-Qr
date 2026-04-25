import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
});

export const updateCategorySchema = createCategorySchema.partial();

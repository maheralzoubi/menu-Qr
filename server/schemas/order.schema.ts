import { z } from 'zod';

const cartItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().default(''),
  price: z.number().min(0),
  image: z.string().default(''),
  category: z.string().default(''),
  quantity: z.number().int().min(1),
  featured: z.boolean().default(false),
  ingredients: z.array(z.string()).default([]),
  allergens: z.array(z.string()).default([]),
});

export const createOrderSchema = z.object({
  items: z.array(cartItemSchema).min(1),
  total: z.number().min(0),
  discount: z.number().min(0).optional(),
  promoCode: z.string().optional(),
  restaurantId: z.string().min(1),
  tableNumber: z.string().optional(),
  customerName: z.string().optional(),
  fcmToken: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['Pending', 'Preparing', 'Ready', 'Delivered']),
});

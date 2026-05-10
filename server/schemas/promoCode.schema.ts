import { z } from 'zod';

export const createPromoCodeSchema = z.object({
  code: z.string().min(1).max(20),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().min(0.01),
  expiryDate: z.string().datetime().optional(),
  maxUses: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const validatePromoCodeSchema = z.object({
  code: z.string().min(1),
  restaurantId: z.string().min(1),
  subtotal: z.number().min(0),
});

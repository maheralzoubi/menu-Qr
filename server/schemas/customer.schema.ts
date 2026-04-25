import { z } from 'zod';

export const customerRegisterSchema = z.object({
  restaurantId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
});

export const customerLoginSchema = z.object({
  restaurantId: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
});

export const customerUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
});

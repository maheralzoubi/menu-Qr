import { z } from 'zod';

export const createReservationSchema = z.object({
  restaurantId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  date: z.string().min(1),
  time: z.string().min(1),
  guests: z.number().int().min(1),
});

export const updateReservationStatusSchema = z.object({
  status: z.enum(['Confirmed', 'Pending', 'Cancelled']),
});

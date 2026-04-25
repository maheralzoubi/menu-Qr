import { z } from 'zod';

export const createReviewSchema = z.object({
  restaurantId: z.string().min(1),
  userName: z.string().min(1),
  userInitials: z.string().min(1).max(3),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1),
  image: z.string().optional(),
});

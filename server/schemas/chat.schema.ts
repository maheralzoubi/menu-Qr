import { z } from 'zod';

export const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().trim().min(1).max(2000),
  })).min(1).max(40)
    .refine(m => m[0].role === 'user' && m[m.length - 1].role === 'user', 'Conversation must start and end with a user message'),
  cart: z.array(z.object({
    id: z.string(),
    quantity: z.number().int().min(1).max(99),
    note: z.string().max(200).optional(),
  })).max(100).default([]),
  lang: z.enum(['en', 'ar']).default('en'),
  table: z.string().max(20).optional(),
});

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
  note: z.string().optional().default(''),
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
  order_source: z.enum(['QR_CODE', 'CUSTOMER_APP', 'CASHIER_POS']).optional(),
  order_type: z.enum(['DINE_IN', 'TAKEAWAY', 'PICKUP', 'DELIVERY']).optional(),
  payment_method: z.enum(['CASH', 'CARD', 'CLIQ', 'UNPAID', 'PAY_LATER']).optional(),
  payment_status: z.enum(['PAID', 'UNPAID', 'PENDING_CASH', 'PENDING_CARD_PAYMENT', 'PENDING_CLIQ_VERIFICATION', 'REFUNDED']).optional(),
  cashier_id: z.string().optional(),
  cashier_name: z.string().optional(),
  order_note: z.string().optional(),
  discount_type: z.enum(['CODE', 'PERCENTAGE', 'FIXED']).optional(),
  discount_applied_by: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['Pending', 'Preparing', 'Ready', 'Delivered', 'Cancelled']),
});

export const confirmPaymentSchema = z.object({
  confirmed_by: z.string().optional(),
});

import mongoose, { Document, Schema } from 'mongoose';

export interface ICartItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  quantity: number;
  featured: boolean;
  ingredients: string[];
  allergens: string[];
  note?: string;
}

export interface IOrder extends Document {
  items: ICartItem[];
  total: number;
  discount: number;
  promoCode?: string;
  status: 'Pending' | 'Preparing' | 'Ready' | 'Delivered' | 'Cancelled';
  tableNumber?: string;
  customerName?: string;
  address?: string;
  fcmToken?: string;
  restaurantId: mongoose.Types.ObjectId;
  archivedAt?: Date;
  createdAt: Date;
  // POS / extended fields
  order_source?: 'QR_CODE' | 'CUSTOMER_APP' | 'CASHIER_POS';
  order_type?: 'DINE_IN' | 'TAKEAWAY' | 'PICKUP' | 'DELIVERY';
  payment_method?: 'CASH' | 'CARD' | 'CLIQ' | 'UNPAID' | 'PAY_LATER';
  payment_status?: 'PAID' | 'UNPAID' | 'PENDING_CASH' | 'PENDING_CARD_PAYMENT' | 'PENDING_CLIQ_VERIFICATION' | 'REFUNDED';
  cashier_id?: string;
  cashier_name?: string;
  order_note?: string;
  discount_type?: 'CODE' | 'PERCENTAGE' | 'FIXED';
  discount_applied_by?: string;
  paid_at?: Date;
  confirmed_by?: string;
}

const CartItemSchema = new Schema<ICartItem>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true },
    image: { type: String, default: '' },
    category: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 1 },
    featured: { type: Boolean, default: false },
    ingredients: { type: [String], default: [] },
    allergens: { type: [String], default: [] },
    note: { type: String, default: '' },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    items: { type: [CartItemSchema], required: true },
    total: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    promoCode: { type: String },
    status: { type: String, enum: ['Pending', 'Preparing', 'Ready', 'Delivered', 'Cancelled'], default: 'Pending' },
    tableNumber: { type: String },
    customerName: { type: String },
    address: { type: String, default: '' },
    fcmToken: { type: String },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    archivedAt: { type: Date },
    order_source: { type: String, enum: ['QR_CODE', 'CUSTOMER_APP', 'CASHIER_POS'] },
    order_type: { type: String, enum: ['DINE_IN', 'TAKEAWAY', 'PICKUP', 'DELIVERY'] },
    payment_method: { type: String, enum: ['CASH', 'CARD', 'CLIQ', 'UNPAID', 'PAY_LATER'] },
    payment_status: { type: String, enum: ['PAID', 'UNPAID', 'PENDING_CASH', 'PENDING_CARD_PAYMENT', 'PENDING_CLIQ_VERIFICATION', 'REFUNDED'] },
    cashier_id: { type: String },
    cashier_name: { type: String },
    order_note: { type: String },
    discount_type: { type: String, enum: ['CODE', 'PERCENTAGE', 'FIXED'] },
    discount_applied_by: { type: String },
    paid_at: { type: Date },
    confirmed_by: { type: String },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export const Order = mongoose.model<IOrder>('Order', OrderSchema);

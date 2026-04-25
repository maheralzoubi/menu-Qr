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
}

export interface IOrder extends Document {
  items: ICartItem[];
  total: number;
  status: 'Pending' | 'Preparing' | 'Ready' | 'Delivered';
  tableNumber?: string;
  customerName?: string;
  address?: string;
  restaurantId: mongoose.Types.ObjectId;
  createdAt: Date;
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
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    items: { type: [CartItemSchema], required: true },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['Pending', 'Preparing', 'Ready', 'Delivered'], default: 'Pending' },
    tableNumber: { type: String },
    customerName: { type: String },
    address: { type: String, default: '' },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export const Order = mongoose.model<IOrder>('Order', OrderSchema);

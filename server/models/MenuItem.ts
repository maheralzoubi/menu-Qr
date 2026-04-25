import mongoose, { Document, Schema } from 'mongoose';

export interface IMenuItem extends Document {
  name: string;
  category: string;
  price: number;
  description: string;
  longDescription: string;
  ingredients: string[];
  allergens: string[];
  image: string;
  featured: boolean;
  restaurantId: mongoose.Types.ObjectId;
}

const MenuItemSchema = new Schema<IMenuItem>(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, default: '' },
    longDescription: { type: String, default: '' },
    ingredients: { type: [String], default: [] },
    allergens: { type: [String], default: [] },
    image: { type: String, default: '' },
    featured: { type: Boolean, default: false },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export const MenuItem = mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);

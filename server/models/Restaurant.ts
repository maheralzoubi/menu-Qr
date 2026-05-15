import mongoose, { Document, Schema } from 'mongoose';

export interface IRestaurant extends Document {
  name: string;
  logo?: string;
  primaryColor: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  status: 'active' | 'inactive';
  adminId: mongoose.Types.ObjectId;
  ownerId?: mongoose.Types.ObjectId; // subscriber who created this restaurant (null = created by superadmin)
}

const RestaurantSchema = new Schema<IRestaurant>(
  {
    name: { type: String, required: true, trim: true },
    logo: { type: String },
    primaryColor: { type: String, default: '#9b3f25' },
    contactEmail: { type: String, trim: true, lowercase: true },
    contactPhone: { type: String, trim: true },
    address: { type: String, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export const Restaurant = mongoose.model<IRestaurant>('Restaurant', RestaurantSchema);

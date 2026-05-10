import mongoose, { Document, Schema } from 'mongoose';

export interface IPromoCode extends Document {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  expiryDate?: Date;
  maxUses?: number;
  usedCount: number;
  isActive: boolean;
  restaurantId: mongoose.Types.ObjectId;
}

const PromoCodeSchema = new Schema<IPromoCode>(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    expiryDate: { type: Date },
    maxUses: { type: Number, min: 0 },
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  },
  { timestamps: true }
);

PromoCodeSchema.index({ code: 1, restaurantId: 1 }, { unique: true });

export const PromoCode = mongoose.model<IPromoCode>('PromoCode', PromoCodeSchema);

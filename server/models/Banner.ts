import mongoose, { Schema, Document } from 'mongoose';

export interface IBanner extends Document {
  title: string;
  subtitle: string;
  emoji: string;
  isActive: boolean;
  sortOrder: number;
}

const BannerSchema = new Schema<IBanner>(
  {
    title:     { type: String, required: true },
    subtitle:  { type: String, default: '' },
    emoji:     { type: String, default: '🛍️' },
    isActive:  { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Banner = mongoose.model<IBanner>('Banner', BannerSchema);

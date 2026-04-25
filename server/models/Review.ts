import mongoose, { Document, Schema } from 'mongoose';

export interface IReview extends Document {
  userName: string;
  userInitials: string;
  rating: number;
  comment: string;
  image?: string;
  date: string;
  restaurantId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    userName: { type: String, required: true, trim: true },
    userInitials: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    image: { type: String },
    date: { type: String, default: 'Just now' },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export const Review = mongoose.model<IReview>('Review', ReviewSchema);

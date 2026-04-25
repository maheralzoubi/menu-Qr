import { Review } from '../models/Review';

export const getReviews = (restaurantId: string) =>
  Review.find({ restaurantId }).sort({ createdAt: -1 });

export const createReview = (data: object) => Review.create(data);

export const deleteReview = (id: string, restaurantId: string) =>
  Review.findOneAndDelete({ _id: id, restaurantId });

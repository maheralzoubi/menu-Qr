import { Review } from '../models/Review';

export const getReviews = () => Review.find().sort({ createdAt: -1 });

export const createReview = (data: object) => Review.create(data);

export const deleteReview = (id: string) => Review.findByIdAndDelete(id);

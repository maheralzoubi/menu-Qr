import mongoose, { Schema, Document } from 'mongoose';

export interface IPlan extends Document {
  key: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  monthlyPrice: number;
  annualPrice: number;
  restaurantLimit: number;
  features: string[];
  featuresAr: string[];
  popular: boolean;
  active: boolean;
  sortOrder: number;
  // Live Stripe Price IDs — updated whenever the price is changed via the admin panel
  stripePriceIdMonthly?: string;
  stripePriceIdAnnual?: string;
}

const PlanSchema = new Schema<IPlan>(
  {
    key:             { type: String, required: true, unique: true },
    name:            { type: String, required: true },
    nameAr:          { type: String, default: '' },
    description:     { type: String, default: '' },
    descriptionAr:   { type: String, default: '' },
    monthlyPrice:    { type: Number, required: true, min: 0 },
    annualPrice:     { type: Number, required: true, min: 0 },
    restaurantLimit: { type: Number, required: true, default: 1 },
    features:        [{ type: String }],
    featuresAr:      [{ type: String }],
    popular:               { type: Boolean, default: false },
    active:                { type: Boolean, default: true },
    sortOrder:             { type: Number, default: 0 },
    stripePriceIdMonthly:  { type: String },
    stripePriceIdAnnual:   { type: String },
  },
  { timestamps: true }
);

export const Plan = (mongoose.models.Plan as mongoose.Model<IPlan>) ?? mongoose.model<IPlan>('Plan', PlanSchema);

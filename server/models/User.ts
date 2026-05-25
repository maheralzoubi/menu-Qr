import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  password: string;
  role: 'admin' | 'staff' | 'superadmin' | 'owner';
  status: 'active' | 'locked';
  restaurantId?: mongoose.Types.ObjectId;
  name?: string;
  phone?: string;
  title?: string;
  avatar?: string;
  // Subscription fields (populated for 'owner' role accounts)
  plan?: 'starter' | 'pro' | 'enterprise';
  planBilling?: 'monthly' | 'annual';
  planActivatedAt?: Date;
  planStatus?: 'active' | 'trialing' | 'past_due' | 'canceled';
  restaurantName?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'staff', 'superadmin', 'owner'], default: 'admin' },
    status: { type: String, enum: ['active', 'locked'], default: 'active' },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant' },
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    title: { type: String, trim: true },
    avatar: { type: String },
    plan: { type: String, enum: ['starter', 'pro', 'enterprise'] },
    planBilling: { type: String, enum: ['monthly', 'annual'] },
    planActivatedAt: { type: Date },
    planStatus: { type: String, enum: ['active', 'trialing', 'past_due', 'canceled'] },
    restaurantName: { type: String, trim: true },
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
  },
  { timestamps: true }
);

UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

UserSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.model<IUser>('User', UserSchema);

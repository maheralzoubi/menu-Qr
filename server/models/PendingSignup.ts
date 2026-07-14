import mongoose, { Document, Schema } from 'mongoose';

// Holds a not-yet-paid owner signup while the email gets verified, before
// any real User account exists. Auto-expires via TTL so abandoned signups
// don't linger.
export interface IPendingSignup extends Document {
  email: string;
  name: string;
  password: string;
  plan: 'starter' | 'pro' | 'enterprise';
  billing: 'monthly' | 'annual';
  verified: boolean;
  verificationCodeHash?: string;
  verificationCodeExpires?: Date;
  verificationAttempts: number;
  createdAt: Date;
}

const PendingSignupSchema = new Schema<IPendingSignup>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  password: { type: String, required: true },
  plan: { type: String, enum: ['starter', 'pro', 'enterprise'], required: true },
  billing: { type: String, enum: ['monthly', 'annual'], default: 'monthly' },
  verified: { type: Boolean, default: false },
  verificationCodeHash: { type: String },
  verificationCodeExpires: { type: Date },
  verificationAttempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now, expires: 7200 }, // TTL: 2 hours
});

export const PendingSignup = mongoose.model<IPendingSignup>('PendingSignup', PendingSignupSchema);

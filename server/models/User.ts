import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  password: string;
  role: 'admin' | 'staff' | 'superadmin';
  restaurantId?: mongoose.Types.ObjectId;
  name?: string;
  phone?: string;
  title?: string;
  avatar?: string;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'staff', 'superadmin'], default: 'admin' },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant' },
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    title: { type: String, trim: true },
    avatar: { type: String },
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

import mongoose, { Document, Schema } from 'mongoose';

// Platform-wide customer of the Menu Go app. Unlike `Customer` (scoped to a
// single restaurant, password based), app users sign in with an emailed code
// and can order from any restaurant.
export interface IAppAddress {
  id: string;
  label: string;
  line: string;
}

export interface IAppUser extends Document {
  email: string;
  name?: string;
  addresses: IAppAddress[];
  loginCodeHash?: string;
  loginCodeExpires?: Date;
  loginCodeSentAt?: Date;
  loginAttempts: number;
}

const AddressSchema = new Schema<IAppAddress>(
  {
    id: { type: String, required: true },
    label: { type: String, default: '', trim: true },
    line: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const AppUserSchema = new Schema<IAppUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, trim: true },
    addresses: { type: [AddressSchema], default: [] },
    loginCodeHash: { type: String },
    loginCodeExpires: { type: Date },
    loginCodeSentAt: { type: Date },
    loginAttempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const AppUser = mongoose.model<IAppUser>('AppUser', AppUserSchema);

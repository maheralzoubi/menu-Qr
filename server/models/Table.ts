import mongoose, { Document, Schema } from 'mongoose';

export interface ITable extends Document {
  name: string;
  restaurantId: mongoose.Types.ObjectId;
  manualStatus: 'occupied' | 'free' | null;
}

const TableSchema = new Schema<ITable>(
  {
    name: { type: String, required: true, trim: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    manualStatus: { type: String, enum: ['occupied', 'free', null], default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

TableSchema.index({ name: 1, restaurantId: 1 }, { unique: true });

export const Table = mongoose.model<ITable>('Table', TableSchema);

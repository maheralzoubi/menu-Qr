import { Table } from '../models/Table';
import { Order } from '../models/Order';

export async function getTables(restaurantId: string) {
  const tables = await Table.find({ restaurantId }).sort({ createdAt: 1 });

  // Compute auto status from active orders
  const activeOrders = await Order.find({
    restaurantId,
    status: { $in: ['Pending', 'Preparing', 'Ready'] },
  }).select('tableNumber');

  const occupiedTables = new Set(activeOrders.map(o => o.tableNumber).filter(Boolean));

  return tables.map(t => ({
    ...t.toJSON(),
    status: t.manualStatus ?? (occupiedTables.has(t.name) ? 'occupied' : 'free'),
  }));
}

export const createTable = (data: object) => Table.create(data);

export const deleteTable = (id: string, restaurantId: string) =>
  Table.findOneAndDelete({ _id: id, restaurantId });

export const setManualStatus = (id: string, restaurantId: string, manualStatus: string | null) =>
  Table.findOneAndUpdate({ _id: id, restaurantId }, { manualStatus }, { returnDocument: 'after' });

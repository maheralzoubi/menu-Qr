import { Order } from '../models/Order';
import { applyPromoCode } from './promoCodeService';

// Live feed: only non-archived orders
export const getOrders = (restaurantId: string) =>
  Order.find({ restaurantId, archivedAt: { $exists: false } }).sort({ createdAt: -1 });

export const getOrderById = (id: string) => Order.findById(id);

export const createOrder = async (data: any) => {
  const order = await Order.create(data);
  if (data.promoCode && data.restaurantId) {
    await applyPromoCode(data.promoCode, data.restaurantId);
  }
  return order;
};

export const updateOrderStatus = (id: string, restaurantId: string, status: string) =>
  Order.findOneAndUpdate({ _id: id, restaurantId }, { status }, { returnDocument: 'after' });

export const confirmOrderPayment = (id: string, restaurantId: string, confirmedBy: string) =>
  Order.findOneAndUpdate(
    { _id: id, restaurantId },
    { payment_status: 'PAID', paid_at: new Date(), confirmed_by: confirmedBy },
    { returnDocument: 'after' }
  );

export const deleteOrder = (id: string, restaurantId: string) =>
  Order.findOneAndDelete({ _id: id, restaurantId });

// Archive all orders created today (midnight → now) for this restaurant
export const archiveTodayOrders = (restaurantId: string) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return Order.updateMany(
    { restaurantId, archivedAt: { $exists: false }, createdAt: { $gte: start } },
    { archivedAt: new Date() }
  );
};

export interface ArchiveFilters {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  tableNumber?: string;
  page?: number;
  limit?: number;
}

export const getArchivedOrders = async (restaurantId: string, filters: ArchiveFilters) => {
  const { search, status, dateFrom, dateTo, tableNumber, page = 1, limit = 50 } = filters;

  const query: Record<string, any> = {
    restaurantId,
    archivedAt: { $exists: true },
  };

  if (status) query.status = status;
  if (tableNumber) query.tableNumber = tableNumber;

  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  if (search) {
    query.$or = [
      { _id: { $regex: search, $options: 'i' } },
      { customerName: { $regex: search, $options: 'i' } },
      { tableNumber: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    Order.find(query).sort({ archivedAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(query),
  ]);

  return { orders, total, page, pages: Math.ceil(total / limit) };
};

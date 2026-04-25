import { Order } from '../models/Order';

export const getOrders = (restaurantId: string) =>
  Order.find({ restaurantId }).sort({ createdAt: -1 });

export const getOrderById = (id: string) => Order.findById(id);

export const createOrder = (data: object) => Order.create(data);

export const updateOrderStatus = (id: string, restaurantId: string, status: string) =>
  Order.findOneAndUpdate({ _id: id, restaurantId }, { status }, { new: true });

export const deleteOrder = (id: string, restaurantId: string) =>
  Order.findOneAndDelete({ _id: id, restaurantId });

import { Order } from '../models/Order';

export const getOrders = () => Order.find().sort({ createdAt: -1 });

export const getOrderById = (id: string) => Order.findById(id);

export const createOrder = (data: object) => Order.create(data);

export const updateOrderStatus = (id: string, status: string) =>
  Order.findByIdAndUpdate(id, { status }, { new: true });

export const deleteOrder = (id: string) => Order.findByIdAndDelete(id);

import { Request, Response, NextFunction } from 'express';
import * as ordersService from '../services/ordersService';
import { getIO } from '../socket/index';

export const getOrders = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await ordersService.getOrders());
  } catch (e) { next(e); }
};

export const getOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await ordersService.getOrderById(req.params.id);
    if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
    res.json(order);
  } catch (e) { next(e); }
};

export const postOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await ordersService.createOrder(req.body);
    getIO().to('admin').emit('order:new', order);
    res.status(201).json(order);
  } catch (e) { next(e); }
};

export const updateStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await ordersService.updateOrderStatus(req.params.id, req.body.status);
    if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
    getIO().to(`order:${order._id}`).to('admin').emit('order:status', {
      id: order._id,
      status: order.status,
    });
    res.json(order);
  } catch (e) { next(e); }
};

export const deleteOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await ordersService.deleteOrder(req.params.id);
    if (!deleted) { res.status(404).json({ message: 'Order not found' }); return; }
    res.status(204).send();
  } catch (e) { next(e); }
};

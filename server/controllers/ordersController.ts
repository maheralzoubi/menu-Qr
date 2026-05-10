import { Request, Response, NextFunction } from 'express';
import * as ordersService from '../services/ordersService';
import { AuthRequest } from '../middleware/auth';
import { getIO } from '../socket/index';
import { sendOrderStatusNotification } from '../services/notificationService';

export const getOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    res.json(await ordersService.getOrders(restaurantId));
  } catch (e) { next(e); }
};

export const getOrder = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await ordersService.getOrderById((_req as any).params.id);
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

export const updateStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const order = await ordersService.updateOrderStatus(req.params.id, restaurantId, req.body.status);
    if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
    getIO().to(`order:${order._id}`).to('admin').emit('order:status', { id: order._id, status: order.status });
    if (order.fcmToken) {
      sendOrderStatusNotification(order.fcmToken, order.status, order._id.toString());
    }
    res.json(order);
  } catch (e) { next(e); }
};

export const deleteOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const deleted = await ordersService.deleteOrder(req.params.id, restaurantId);
    if (!deleted) { res.status(404).json({ message: 'Order not found' }); return; }
    res.status(204).send();
  } catch (e) { next(e); }
};

export const archiveToday = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const result = await ordersService.archiveTodayOrders(restaurantId);
    res.json({ archived: result.modifiedCount });
  } catch (e) { next(e); }
};

export const getArchivedOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const { search, status, dateFrom, dateTo, tableNumber, page, limit } = req.query as Record<string, string>;
    const result = await ordersService.getArchivedOrders(restaurantId, {
      search, status, dateFrom, dateTo, tableNumber,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
    res.json(result);
  } catch (e) { next(e); }
};

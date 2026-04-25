import { Request, Response, NextFunction } from 'express';
import * as reservationsService from '../services/reservationsService';
import { AuthRequest } from '../middleware/auth';
import { getIO } from '../socket/index';

export const getReservations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    res.json(await reservationsService.getReservations(restaurantId));
  } catch (e) { next(e); }
};

export const postReservation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reservation = await reservationsService.createReservation(req.body);
    getIO().to('admin').emit('reservation:new', reservation);
    res.status(201).json(reservation);
  } catch (e) { next(e); }
};

export const updateStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const reservation = await reservationsService.updateReservationStatus(req.params.id, restaurantId, req.body.status);
    if (!reservation) { res.status(404).json({ message: 'Reservation not found' }); return; }
    res.json(reservation);
  } catch (e) { next(e); }
};

export const deleteReservation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const deleted = await reservationsService.deleteReservation(req.params.id, restaurantId);
    if (!deleted) { res.status(404).json({ message: 'Reservation not found' }); return; }
    res.status(204).send();
  } catch (e) { next(e); }
};

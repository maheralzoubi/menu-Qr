import { Request, Response, NextFunction } from 'express';
import * as reservationsService from '../services/reservationsService';
import { getIO } from '../socket/index';

export const getReservations = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await reservationsService.getReservations());
  } catch (e) { next(e); }
};

export const postReservation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reservation = await reservationsService.createReservation(req.body);
    getIO().to('admin').emit('reservation:new', reservation);
    res.status(201).json(reservation);
  } catch (e) { next(e); }
};

export const updateStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reservation = await reservationsService.updateReservationStatus(req.params.id, req.body.status);
    if (!reservation) { res.status(404).json({ message: 'Reservation not found' }); return; }
    res.json(reservation);
  } catch (e) { next(e); }
};

export const deleteReservation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await reservationsService.deleteReservation(req.params.id);
    if (!deleted) { res.status(404).json({ message: 'Reservation not found' }); return; }
    res.status(204).send();
  } catch (e) { next(e); }
};

import { Reservation } from '../models/Reservation';

export const getReservations = (restaurantId: string) =>
  Reservation.find({ restaurantId }).sort({ createdAt: -1 });

export const createReservation = (data: object) => Reservation.create(data);

export const updateReservationStatus = (id: string, restaurantId: string, status: string) =>
  Reservation.findOneAndUpdate({ _id: id, restaurantId }, { status }, { returnDocument: 'after' });

export const deleteReservation = (id: string, restaurantId: string) =>
  Reservation.findOneAndDelete({ _id: id, restaurantId });

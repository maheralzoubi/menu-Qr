import { Reservation } from '../models/Reservation';

export const getReservations = () => Reservation.find().sort({ createdAt: -1 });

export const getReservationById = (id: string) => Reservation.findById(id);

export const createReservation = (data: object) => Reservation.create(data);

export const updateReservationStatus = (id: string, status: string) =>
  Reservation.findByIdAndUpdate(id, { status }, { new: true });

export const deleteReservation = (id: string) => Reservation.findByIdAndDelete(id);

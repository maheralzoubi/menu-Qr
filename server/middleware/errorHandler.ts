import { Request, Response, NextFunction } from 'express';
import { EmailDeliveryError } from '../services/emailService';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);
  if (err instanceof EmailDeliveryError) {
    res.status(502).json({ code: 'EMAIL_FAILED', message: "We couldn't send the email. Please try again in a moment." });
    return;
  }
  res.status(500).json({ message: err.message ?? 'Internal server error' });
}

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = (result.error as ZodError).issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Validation failed', errors });
      return;
    }
    req.body = result.data;
    next();
  };
}

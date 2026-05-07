import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'ValidationError', issues: err.issues });
  }
  if (err && typeof err === 'object' && 'status' in err) {
    const status = Number((err as { status?: number }).status) || 500;
    return res.status(status).json({ error: (err as Error).message });
  }
  console.error('[error]', err);
  res.status(500).json({ error: 'InternalServerError' });
};

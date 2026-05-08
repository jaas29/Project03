import type { RequestHandler } from 'express';
import type { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema): RequestHandler => (req, _res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) return next(result.error);
  req.body = result.data;
  next();
};

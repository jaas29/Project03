import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/requireAuth';
import { loginSchema, refreshSchema, registerSchema } from './auth.schemas';
import { login, me, refresh, register } from '../controllers/auth.controller';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRouter = Router();

authRouter.post('/register', authLimiter, validate(registerSchema), register);
authRouter.post('/login', authLimiter, validate(loginSchema), login);
authRouter.post('/refresh', authLimiter, validate(refreshSchema), refresh);
authRouter.get('/me', requireAuth, me);

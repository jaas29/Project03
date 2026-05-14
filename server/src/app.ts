import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env, isAllowedOrigin } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './routes/auth.routes';
import { duelsRouter } from './routes/duels';
import puzzlesRouter from './routes/puzzles';
import leaderboardRouter from './routes/leaderboard';
import adminRouter from './routes/admin';
import profileRouter from './routes/profile'; // ← new

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
    credentials: true,
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/puzzles', puzzlesRouter);
  app.use('/api/duels', duelsRouter);
  app.use('/api/leaderboard', leaderboardRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/profile', profileRouter); // ← new: covers /api/profile/me and /api/profile/:username

  app.use(errorHandler);
  return app;
}

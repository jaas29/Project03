import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import puzzlesRouter from './routes/puzzles';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // TODO: mount routes
  // app.use('/api/auth', authRouter);
  app.use('/api/puzzles', puzzlesRouter);
  // app.use('/api/duels', duelsRouter);
  // app.use('/api/leaderboard', leaderboardRouter);
  // app.use('/api/admin', adminRouter);

  app.use(errorHandler);
  return app;
}

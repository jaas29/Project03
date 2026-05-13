import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/requireAuth';
import { createHotseat, getMatch, submitScore, getActiveMatch } from '../controllers/duel.controller';

const createHotseatSchema = z.object({
  opponentUsername: z.string().min(3).max(24),
  puzzleType: z.enum(['grid', 'connections', 'wordle', 'higherlower']).default('wordle'),
});

const submitSchema = z.object({
  attempts: z.number().int().positive(),
  durationMs: z.number().int().nonnegative(),
  solved: z.boolean(),
});

export const duelsRouter = Router();

duelsRouter.use(requireAuth);

duelsRouter.get('/active', getActiveMatch);
duelsRouter.post('/hotseat', validate(createHotseatSchema), createHotseat);
duelsRouter.get('/:matchId', getMatch);
duelsRouter.post('/:matchId/submit', validate(submitSchema), submitScore);

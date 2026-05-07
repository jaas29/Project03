import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Puzzle } from '../models/Puzzle';
import { PlayResult } from '../models/PlayResult';
import { calculateScore } from '../services/scoreCalculator';
import { runDailyPuzzleJob } from '../jobs/dailyPuzzleJob';
import { PuzzleType } from '../types/puzzle';

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

const PUZZLE_TYPES: PuzzleType[] = ['grid', 'connections', 'wordle'];

export async function getTodayPuzzles(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const date = todayUTC();
    let puzzles = await Puzzle.find({ date, type: { $in: PUZZLE_TYPES } }).select('-solution').lean();

    if (puzzles.length < PUZZLE_TYPES.length) {
      await runDailyPuzzleJob();
      puzzles = await Puzzle.find({ date, type: { $in: PUZZLE_TYPES } }).select('-solution').lean();
    }

    res.json({ date, puzzles });
  } catch (err) {
    next(err);
  }
}

export async function getPuzzleById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const puzzle = await Puzzle.findById(req.params.id).select('-solution');
    if (!puzzle) {
      res.status(404).json({ error: 'Puzzle not found' });
      return;
    }
    res.json(puzzle);
  } catch (err) {
    next(err);
  }
}

const SubmitSchema = z.object({
  attempts: z.number().int().positive(),
  durationMs: z.number().int().nonnegative(),
  solved: z.boolean(),
});

export async function submitPuzzle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = SubmitSchema.parse(req.body);
    const puzzle = await Puzzle.findById(req.params.id);
    if (!puzzle) {
      res.status(404).json({ error: 'Puzzle not found' });
      return;
    }

    // requireAuth middleware attaches req.user; fall back to anonymous score only
    const userId = (req as Request & { user?: { id: string } }).user?.id;

    const score = calculateScore({
      type: puzzle.type as PuzzleType,
      attempts: body.attempts,
      durationMs: body.durationMs,
      solved: body.solved,
    });

    if (userId) {
      const existing = await PlayResult.findOne({ userId, puzzleId: puzzle._id });
      if (existing) {
        res.status(409).json({ error: 'Already submitted', score: existing.score });
        return;
      }
      await PlayResult.create({
        userId,
        puzzleId: puzzle._id,
        score,
        attempts: body.attempts,
        durationMs: body.durationMs,
      });
    }

    res.json({ score, solution: body.solved ? undefined : puzzle.solution });
  } catch (err) {
    next(err);
  }
}

// Admin: force-regenerate today's puzzles
export async function adminRegeneratePuzzles(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const date = todayUTC();
    await Puzzle.deleteMany({ date });
    await runDailyPuzzleJob();
    res.json({ message: `Puzzles regenerated for ${date}` });
  } catch (err) {
    next(err);
  }
}

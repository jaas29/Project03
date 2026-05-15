import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Puzzle } from '../models/Puzzle';
import { PlayResult } from '../models/PlayResult';
import { User } from '../models/User';
import { calculateScore } from '../services/scoreCalculator';
import { checkPuzzleGuess, validatePuzzleSubmission } from '../services/puzzleValidation';
import { runDailyPuzzleJob } from '../jobs/dailyPuzzleJob';
import { PuzzleType } from '../types/puzzle';

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

const PUZZLE_TYPES: PuzzleType[] = ['grid', 'connections', 'wordle', 'higherlower'];

export async function getTodayPuzzles(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const date = todayUTC();
    let puzzles = await Puzzle.find({ date, type: { $in: PUZZLE_TYPES } }).lean();

    if (puzzles.length < PUZZLE_TYPES.length) {
      await runDailyPuzzleJob();
      puzzles = await Puzzle.find({ date, type: { $in: PUZZLE_TYPES } }).lean();
    }

    res.json({ date, puzzles: puzzles.map(toPublicPuzzle) });
  } catch (err) {
    next(err);
  }
}

export async function getPuzzleById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const puzzle = await Puzzle.findById(req.params.id).lean();
    if (!puzzle) {
      res.status(404).json({ error: 'Puzzle not found' });
      return;
    }
    res.json(toPublicPuzzle(puzzle));
  } catch (err) {
    next(err);
  }
}

function toPublicPuzzle(puzzle: { [key: string]: unknown; type?: unknown; payload?: unknown; solution?: unknown }) {
  const { solution, ...publicPuzzle } = puzzle;
  if (publicPuzzle.type !== 'grid' || !isRecord(publicPuzzle.payload)) return publicPuzzle;

  const payload = { ...publicPuzzle.payload };
  if (!Array.isArray(payload.playerPool) || payload.playerPool.length === 0) {
    payload.playerPool = derivePlayerPool(solution);
  }

  return { ...publicPuzzle, payload };
}

function derivePlayerPool(solution: unknown): string[] {
  if (!isRecord(solution) || !isRecord(solution.cells)) return [];
  const names = Object.values(solution.cells).flatMap((value) => {
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
    return [];
  });
  return [...new Set(names.filter((name) => name && name !== '?'))].sort();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const SubmitSchema = z.object({
  attempts: z.number().int().positive(),
  durationMs: z.number().int().nonnegative(),
  solved: z.boolean().optional(),
  guesses: z.unknown().optional(),
  groups: z.unknown().optional(),
});

const CheckSchema = z.object({
  cellKey: z.string().optional(),
  guess: z.string().optional(),
  group: z.array(z.string()).optional(),
});

export async function checkPuzzle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = CheckSchema.parse(req.body);
    const puzzle = await Puzzle.findById(req.params.id);
    if (!puzzle) {
      res.status(404).json({ error: 'Puzzle not found' });
      return;
    }

    const result = checkPuzzleGuess(puzzle.type as PuzzleType, puzzle.solution, body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function submitPuzzle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = SubmitSchema.parse(req.body);
    const puzzle = await Puzzle.findById(req.params.id);
    if (!puzzle) {
      res.status(404).json({ error: 'Puzzle not found' });
      return;
    }

    // requireAuth middleware attaches req.user; fall back to anonymous score only
    const userId = req.user?.sub;

    const puzzleType = puzzle.type as PuzzleType;
    const validation = validatePuzzleSubmission(puzzleType, puzzle.solution, body);
    const solved = validation.solved;
    const score = calculateScore({
      type: puzzleType,
      attempts: body.attempts,
      durationMs: body.durationMs,
      solved,
      validation,
    });

    let streak: number | undefined;

    if (userId) {
      const existing = await PlayResult.findOne({ userId, puzzleId: puzzle._id });
      if (existing) {
        await PlayResult.findByIdAndUpdate(existing._id, {
          score,
          attempts: body.attempts,
          durationMs: body.durationMs,
          completedAt: new Date(),
        });
      } else {
        await PlayResult.create({
          userId,
          puzzleId: puzzle._id,
          score,
          attempts: body.attempts,
          durationMs: body.durationMs,
        });
      }

      if (solved) {
        streak = await updateStreak(userId, todayUTC());
      }
    }

    res.json({ score, streak, solved, validation });
  } catch (err) {
    next(err);
  }
}

async function updateStreak(userId: string, today: string): Promise<number> {
  const user = await User.findById(userId);
  if (!user) return 0;

  const last = user.streak?.lastPlayedDate;
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  let current = user.streak?.current ?? 0;
  const best = user.streak?.best ?? 0;

  if (last === today) return current; // already counted today

  current = last === yesterdayStr ? current + 1 : 1;
  const newBest = Math.max(best, current);

  await User.findByIdAndUpdate(userId, {
    'streak.current': current,
    'streak.best': newBest,
    'streak.lastPlayedDate': today,
    $inc: { 'stats.played': 1 },
  });

  return current;
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

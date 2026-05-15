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

const STATIC_FALLBACK_CRESTS_BY_COL: Record<string, string> = {
  RMA: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/250px-Real_Madrid_CF.svg.png?utm_source=en.wikipedia.org&utm_campaign=parser&utm_content=thumbnail',
  ARS: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/53/Arsenal_FC.svg/250px-Arsenal_FC.svg.png?utm_source=en.wikipedia.org&utm_campaign=parser&utm_content=thumbnail',
  BAY: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/FC_Bayern_M%C3%BCnchen_logo_%282024%29.svg/250px-FC_Bayern_M%C3%BCnchen_logo_%282024%29.svg.png',
  BAR: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28crest%29.svg/250px-FC_Barcelona_%28crest%29.svg.png?utm_source=en.wikipedia.org&utm_campaign=parser&utm_content=thumbnail',
  CHE: 'https://upload.wikimedia.org/wikipedia/en/thumb/c/cc/Chelsea_FC.svg/250px-Chelsea_FC.svg.png?utm_source=en.wikipedia.org&utm_campaign=parser&utm_content=thumbnail',
  PSG: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a7/Paris_Saint-Germain_F.C..svg/250px-Paris_Saint-Germain_F.C..svg.png?utm_source=en.wikipedia.org&utm_campaign=parser&utm_content=thumbnail',
  MUN: 'https://upload.wikimedia.org/wikipedia/en/thumb/7/7a/Manchester_United_FC_crest.svg/250px-Manchester_United_FC_crest.svg.png?utm_source=en.wikipedia.org&utm_campaign=parser&utm_content=thumbnail',
  INT: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/FC_Internazionale_Milano_2021.svg/250px-FC_Internazionale_Milano_2021.svg.png?utm_source=en.wikipedia.org&utm_campaign=parser&utm_content=thumbnail',
  JUV: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Juventus_FC_-_logo_black_%28Italy%2C_2020%29.svg/250px-Juventus_FC_-_logo_black_%28Italy%2C_2020%29.svg.png?utm_source=en.wikipedia.org&utm_campaign=parser&utm_content=thumbnail',
};

const STATIC_FALLBACK_CRESTS_BY_NAME: Record<string, string> = {
  realmadrid: STATIC_FALLBACK_CRESTS_BY_COL.RMA,
  arsenal: STATIC_FALLBACK_CRESTS_BY_COL.ARS,
  bayernmunich: STATIC_FALLBACK_CRESTS_BY_COL.BAY,
  barcelona: STATIC_FALLBACK_CRESTS_BY_COL.BAR,
  chelsea: STATIC_FALLBACK_CRESTS_BY_COL.CHE,
  parissaintgermain: STATIC_FALLBACK_CRESTS_BY_COL.PSG,
  manchesterunited: STATIC_FALLBACK_CRESTS_BY_COL.MUN,
  intermilan: STATIC_FALLBACK_CRESTS_BY_COL.INT,
  juventus: STATIC_FALLBACK_CRESTS_BY_COL.JUV,
};

function normalizeTeamLookup(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function normalizeCrestUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;
}

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
  if (isRecord(payload.teamMeta)) {
    const nextTeamMeta: Record<string, unknown> = {};
    Object.entries(payload.teamMeta).forEach(([col, meta]) => {
      if (!isRecord(meta)) {
        nextTeamMeta[col] = meta;
        return;
      }

      const name = typeof meta.name === 'string' ? meta.name : '';
      let crest = typeof meta.crest === 'string' ? normalizeCrestUrl(meta.crest) : '';
      if (!crest) {
        crest = STATIC_FALLBACK_CRESTS_BY_COL[col]
          ?? STATIC_FALLBACK_CRESTS_BY_NAME[normalizeTeamLookup(name)]
          ?? '';
      }

      nextTeamMeta[col] = { ...meta, name, crest };
    });
    payload.teamMeta = nextTeamMeta;
  }

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

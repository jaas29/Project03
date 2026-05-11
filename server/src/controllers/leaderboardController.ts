import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { PlayResult } from '../models/PlayResult';
import { Puzzle } from '../models/Puzzle';

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

// GET /api/leaderboard/elo  — top 50 players by ELO (ranked ladder)
export async function eloLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = Math.min(Number(req.query.limit ?? 50), 100);
    const players = await User.find()
      .sort({ elo: -1 })
      .limit(limit)
      .select('username elo stats streak.current')
      .lean();

    res.json({
      type: 'elo',
      entries: players.map((p, i) => ({
        rank: i + 1,
        username: p.username,
        elo: p.elo,
        wins: p.stats?.wins ?? 0,
        losses: p.stats?.losses ?? 0,
        streak: p.streak?.current ?? 0,
      })),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/leaderboard/daily  — top scores for today's puzzles
export async function dailyLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const date = todayUTC();
    const puzzleType = req.query.type as string | undefined;

    const puzzleFilter: Record<string, unknown> = { date };
    if (puzzleType) puzzleFilter.type = puzzleType;

    const puzzles = await Puzzle.find(puzzleFilter).select('_id type').lean();
    const puzzleIds = puzzles.map((p) => p._id);

    const results = await PlayResult.find({ puzzleId: { $in: puzzleIds } })
      .sort({ score: -1 })
      .limit(50)
      .populate('userId', 'username')
      .populate('puzzleId', 'type')
      .lean();

    res.json({
      type: 'daily',
      date,
      entries: results.map((r, i) => ({
        rank: i + 1,
        username: (r.userId as unknown as { username: string } | null)?.username ?? 'Unknown',
        puzzleType: (r.puzzleId as unknown as { type: string } | null)?.type ?? '?',
        score: r.score,
        attempts: r.attempts,
        durationMs: r.durationMs,
      })),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/leaderboard/alltime  — top scores of all time aggregated per user
export async function allTimeLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = Math.min(Number(req.query.limit ?? 50), 100);
    const entries = await PlayResult.aggregate([
      { $group: { _id: '$userId', totalScore: { $sum: '$score' }, played: { $sum: 1 } } },
      { $sort: { totalScore: -1 } },
      { $limit: limit },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { username: '$user.username', totalScore: 1, played: 1 } },
    ]);

    res.json({
      type: 'alltime',
      entries: entries.map((e, i) => ({
        rank: i + 1,
        username: e.username,
        totalScore: e.totalScore,
        played: e.played,
      })),
    });
  } catch (err) {
    next(err);
  }
}

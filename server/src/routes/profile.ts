import { Router, type NextFunction, type Request, type Response } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { PlayResult } from '../models/PlayResult';
import { User } from '../models/User';

const router = Router();

type LeanUser = {
  _id: unknown;
  username: string;
  createdAt?: Date;
  elo?: number;
  streak?: {
    current?: number;
    best?: number;
  };
  stats?: {
    played?: number;
    wins?: number;
    losses?: number;
  };
};

type LeanPlayResult = {
  score?: number;
  attempts?: number;
  completedAt?: Date;
  durationMs?: number;
};

function eloRankLabel(elo: number): string {
  if (elo >= 1800) return 'Diamond';
  if (elo >= 1600) return 'Platinum';
  if (elo >= 1450) return 'Gold I';
  if (elo >= 1300) return 'Gold II';
  if (elo >= 1150) return 'Silver';
  return 'Bronze';
}

function publicProfile(user: LeanUser, results: LeanPlayResult[]) {
  const elo = user.elo ?? 1000;
  const played = user.stats?.played ?? results.length;
  const wins = user.stats?.wins ?? results.filter((result) => (result.score ?? 0) > 0).length;
  const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;

  return {
    username: user.username,
    joinedDate: user.createdAt,
    currentStreak: user.streak?.current ?? 0,
    maxStreak: user.streak?.best ?? 0,
    eloRating: elo,
    eloRank: eloRankLabel(elo),
    totalPlayed: played,
    winRate,
    recentGames: results.slice(0, 7).map((result, index) => ({
      date: result.completedAt,
      puzzleNum: index + 1,
      score: result.score ?? 0,
      attempts: result.attempts ?? 0,
      durationMs: result.durationMs ?? 0,
      completed: (result.score ?? 0) > 0,
    })),
  };
}

router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!.sub).select('username createdAt elo streak stats').lean<LeanUser>();
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const results = await PlayResult.find({ userId: req.user!.sub })
      .sort({ completedAt: -1 })
      .limit(30)
      .lean<LeanPlayResult[]>();

    res.json(publicProfile(user, results));
  } catch (err) {
    next(err);
  }
});

router.get('/:username', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('username createdAt elo streak stats')
      .lean<LeanUser>();
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(publicProfile(user, []));
  } catch (err) {
    next(err);
  }
});

export default router;

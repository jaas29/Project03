import type { Request, Response, NextFunction } from 'express';
import { DuelMatch } from '../models/DuelMatch';
import { User } from '../models/User';
import { Puzzle } from '../models/Puzzle';
import { applyElo } from '../services/elo';
import { calculateScore } from '../services/scoreCalculator';
import type { PuzzleType } from '../types/puzzle';

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getActiveMatch(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.sub;
    const match = await DuelMatch.findOne({
      players: userId,
      status: { $in: ['active', 'pending'] },
    })
      .populate('players', 'username elo')
      .populate('puzzleId', '-solution')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ match: match ?? null });
  } catch (err) {
    next(err);
  }
}

export async function createHotseat(req: Request, res: Response, next: NextFunction) {
  try {
    const { opponentUsername, puzzleType } = req.body as {
      opponentUsername: string;
      puzzleType: PuzzleType;
    };

    const opponent = await User.findOne({ username: opponentUsername }).lean();
    if (!opponent) return res.status(404).json({ error: 'Opponent not found' });

    if (opponent._id.toString() === req.user!.sub) {
      return res.status(400).json({ error: 'Cannot duel yourself' });
    }

    const puzzle = await Puzzle.findOne({ date: todayUTC(), type: puzzleType })
      .select('-solution')
      .lean();
    if (!puzzle) {
      return res.status(404).json({ error: `No ${puzzleType} puzzle available for today` });
    }

    const match = await DuelMatch.create({
      players: [req.user!.sub, opponent._id],
      puzzleId: puzzle._id,
      mode: 'hotseat',
      scores: [null, null],
    });

    res.status(201).json({ matchId: match.id, puzzle, opponentUsername });
  } catch (err) {
    next(err);
  }
}

export async function getMatch(req: Request, res: Response, next: NextFunction) {
  try {
    const match = await DuelMatch.findById(req.params.matchId)
      .populate('players', 'username elo')
      .populate('puzzleId', '-solution')
      .lean();

    if (!match) return res.status(404).json({ error: 'Match not found' });

    const playerIds = (match.players as { _id: { toString(): string } }[]).map((p) =>
      p._id.toString()
    );
    if (!playerIds.includes(req.user!.sub)) {
      return res.status(403).json({ error: 'Not a player in this match' });
    }

    res.json({ match });
  } catch (err) {
    next(err);
  }
}

export async function submitScore(req: Request, res: Response, next: NextFunction) {
  try {
    const { attempts, durationMs, solved } = req.body as {
      attempts: number;
      durationMs: number;
      solved: boolean;
    };

    const match = await DuelMatch.findById(req.params.matchId);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (match.status === 'finished') return res.status(409).json({ error: 'Match already finished' });

    const userId = req.user!.sub;
    const playerIndex = match.players.findIndex((p) => p.toString() === userId);
    if (playerIndex === -1) return res.status(403).json({ error: 'Not a player in this match' });

    const scores = match.scores as (number | null)[];
    if (scores[playerIndex] !== null) {
      return res.status(409).json({ error: 'Score already submitted' });
    }

    const puzzle = await Puzzle.findById(match.puzzleId);
    if (!puzzle) return res.status(404).json({ error: 'Puzzle not found' });

    const score = calculateScore({
      type: puzzle.type as PuzzleType,
      attempts,
      durationMs,
      solved,
    });

    scores[playerIndex] = score;
    match.scores = scores;
    match.markModified('scores');

    const otherIndex = playerIndex === 0 ? 1 : 0;
    const bothDone = scores[otherIndex] !== null;

    if (bothDone) {
      const [score0, score1] = scores as [number, number];
      const outcome: 'win' | 'loss' | 'draw' =
        score0 > score1 ? 'win' : score0 < score1 ? 'loss' : 'draw';

      const [player0, player1] = await Promise.all([
        User.findById(match.players[0]),
        User.findById(match.players[1]),
      ]);

      if (player0 && player1) {
        const { newA, newB, delta } = applyElo(player0.elo, player1.elo, outcome);

        const p0WinInc = outcome === 'win' ? 1 : 0;
        const p0LossInc = outcome === 'loss' ? 1 : 0;

        await Promise.all([
          User.findByIdAndUpdate(match.players[0], {
            $set: { elo: newA },
            $inc: { 'stats.played': 1, 'stats.wins': p0WinInc, 'stats.losses': p0LossInc },
          }),
          User.findByIdAndUpdate(match.players[1], {
            $set: { elo: newB },
            $inc: { 'stats.played': 1, 'stats.wins': p0LossInc, 'stats.losses': p0WinInc },
          }),
        ]);

        match.eloDelta = Math.abs(delta);
        match.winner =
          outcome === 'win'
            ? match.players[0]
            : outcome === 'loss'
              ? match.players[1]
              : null;
      }

      match.status = 'finished';
      match.finishedAt = new Date();
    }

    await match.save();

    res.json({ score, bothDone, match: bothDone ? match : undefined });
  } catch (err) {
    next(err);
  }
}

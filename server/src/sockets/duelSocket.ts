import type { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../services/tokens';
import { User } from '../models/User';
import { Puzzle } from '../models/Puzzle';
import { DuelMatch } from '../models/DuelMatch';
import { calculateScore } from '../services/scoreCalculator';
import { applyElo } from '../services/elo';
import type { PuzzleType } from '../types/puzzle';

interface QueueEntry {
  socketId: string;
  userId: string;
  username: string;
  elo: number;
  puzzleType: PuzzleType;
  joinedAt: number;
}

const queue: QueueEntry[] = [];
const ELO_WINDOW = 150;
const QUEUE_EXPAND_AFTER_MS = 30_000;

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function findOpponent(entry: QueueEntry): QueueEntry | undefined {
  const elapsed = Date.now() - entry.joinedAt;
  const window = elapsed > QUEUE_EXPAND_AFTER_MS ? 9999 : ELO_WINDOW;
  return queue.find(
    (q) =>
      q.socketId !== entry.socketId &&
      q.userId !== entry.userId &&
      q.puzzleType === entry.puzzleType &&
      Math.abs(q.elo - entry.elo) <= window,
  );
}

function removeFromQueue(socketId: string) {
  const idx = queue.findIndex((q) => q.socketId === socketId);
  if (idx !== -1) queue.splice(idx, 1);
}

export function registerDuelSocket(io: Server, socket: Socket) {
  // Authenticate via token in socket handshake
  let userId: string | null = null;

  const token = socket.handshake.auth?.token as string | undefined;
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      userId = payload.sub;
    } catch {
      // anonymous — can still listen but can't queue
    }
  }

  // ── Join matchmaking queue ───────────────────────────────────────────────
  socket.on('duel:queue:join', async (data: { puzzleType: PuzzleType }) => {
    if (!userId) {
      socket.emit('duel:error', { message: 'Not authenticated' });
      return;
    }

    removeFromQueue(socket.id);

    const user = await User.findById(userId).lean().catch(() => null);
    if (!user) return;

    const entry: QueueEntry = {
      socketId: socket.id,
      userId,
      username: user.username,
      elo: user.elo,
      puzzleType: data.puzzleType,
      joinedAt: Date.now(),
    };

    const opponent = findOpponent(entry);

    if (opponent) {
      removeFromQueue(opponent.socketId);

      const puzzle = await Puzzle.findOne({ date: todayUTC(), type: data.puzzleType })
        .select('-solution')
        .lean()
        .catch(() => null);

      if (!puzzle) {
        socket.emit('duel:error', { message: `No ${data.puzzleType} puzzle available today` });
        io.to(opponent.socketId).emit('duel:error', { message: `No ${data.puzzleType} puzzle available today` });
        return;
      }

      const match = await DuelMatch.create({
        players: [userId, opponent.userId],
        puzzleId: puzzle._id,
        mode: 'online',
        scores: [null, null],
      }).catch((err) => { console.error('[duelSocket] create error', err); return null; });

      if (!match) return;

      const roomId = `duel:${match.id}`;
      socket.join(roomId);
      io.sockets.sockets.get(opponent.socketId)?.join(roomId);

      io.to(roomId).emit('duel:match:found', {
        matchId: match.id,
        puzzle,
        players: [
          { userId, username: user.username, elo: user.elo },
          { userId: opponent.userId, username: opponent.username, elo: opponent.elo },
        ],
      });
    } else {
      queue.push(entry);
      const queueSize = queue.filter((q) => q.puzzleType === data.puzzleType).length;
      socket.emit('duel:queue:waiting', { position: queueSize, puzzleType: data.puzzleType });
    }
  });

  // ── Leave queue ──────────────────────────────────────────────────────────
  socket.on('duel:queue:leave', () => {
    removeFromQueue(socket.id);
    socket.emit('duel:queue:left', {});
  });

  // ── Join a match room (reconnect / hotseat observer) ─────────────────────
  socket.on('duel:join:room', (data: { matchId: string }) => {
    socket.join(`duel:${data.matchId}`);
  });

  // ── Submit score (online mode) ───────────────────────────────────────────
  socket.on(
    'duel:score:submit',
    async (data: { matchId: string; attempts: number; durationMs: number; solved: boolean }) => {
      if (!userId) {
        socket.emit('duel:error', { message: 'Not authenticated' });
        return;
      }

      const match = await DuelMatch.findById(data.matchId).catch(() => null);
      if (!match || match.status === 'finished') return;

      const playerIndex = match.players.findIndex((p) => p.toString() === userId);
      if (playerIndex === -1) return;

      const scores = match.scores as (number | null)[];
      if (scores[playerIndex] !== null) return;

      const puzzle = await Puzzle.findById(match.puzzleId).catch(() => null);
      if (!puzzle) return;

      const score = calculateScore({
        type: puzzle.type as PuzzleType,
        attempts: data.attempts,
        durationMs: data.durationMs,
        solved: data.solved,
      });

      scores[playerIndex] = score;
      match.scores = scores;
      match.markModified('scores');

      const otherIndex = playerIndex === 0 ? 1 : 0;
      const bothDone = scores[otherIndex] !== null;
      const roomId = `duel:${match.id}`;

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
          const p0Win = outcome === 'win' ? 1 : 0;
          const p0Loss = outcome === 'loss' ? 1 : 0;
          await Promise.all([
            User.findByIdAndUpdate(match.players[0], {
              $set: { elo: newA },
              $inc: { 'stats.played': 1, 'stats.wins': p0Win, 'stats.losses': p0Loss },
            }),
            User.findByIdAndUpdate(match.players[1], {
              $set: { elo: newB },
              $inc: { 'stats.played': 1, 'stats.wins': p0Loss, 'stats.losses': p0Win },
            }),
          ]);
          match.eloDelta = Math.abs(delta);
          match.winner =
            outcome === 'win' ? match.players[0] : outcome === 'loss' ? match.players[1] : null;
        }

        match.status = 'finished';
        match.finishedAt = new Date();
        await match.save();

        const populated = await DuelMatch.findById(match.id)
          .populate('players', 'username elo')
          .lean();
        io.to(roomId).emit('duel:finished', { match: populated });
      } else {
        await match.save();
        io.to(roomId).emit('duel:score:update', { playerIndex, score });
      }
    },
  );

  // ── Forfeit (online mode) ────────────────────────────────────────────────
  socket.on('duel:forfeit', async (data: { matchId: string }) => {
    if (!userId) return;

    const match = await DuelMatch.findById(data.matchId).catch(() => null);
    if (!match || match.status === 'finished') return;

    const playerIndex = match.players.findIndex((p) => p.toString() === userId);
    if (playerIndex === -1) return;

    const opponentIndex = playerIndex === 0 ? 1 : 0;
    const outcome = playerIndex === 0 ? ('loss' as const) : ('win' as const);

    const [player0, player1] = await Promise.all([
      User.findById(match.players[0]),
      User.findById(match.players[1]),
    ]);

    if (player0 && player1) {
      const { newA, newB, delta } = applyElo(player0.elo, player1.elo, outcome);
      const p0Win = outcome === 'win' ? 1 : 0;
      const p0Loss = outcome === 'loss' ? 1 : 0;
      await Promise.all([
        User.findByIdAndUpdate(match.players[0], {
          $set: { elo: newA },
          $inc: { 'stats.played': 1, 'stats.wins': p0Win, 'stats.losses': p0Loss },
        }),
        User.findByIdAndUpdate(match.players[1], {
          $set: { elo: newB },
          $inc: { 'stats.played': 1, 'stats.wins': p0Loss, 'stats.losses': p0Win },
        }),
      ]);
      match.eloDelta = Math.abs(delta);
    }

    match.winner = match.players[opponentIndex];
    match.status = 'finished';
    match.finishedAt = new Date();
    await match.save();

    const populated = await DuelMatch.findById(match.id)
      .populate('players', 'username elo')
      .lean();
    const roomId = `duel:${match.id}`;
    io.to(roomId).emit('duel:finished', { match: populated, forfeitedBy: userId });
  });

  // ── Cleanup on disconnect ────────────────────────────────────────────────
  socket.on('disconnect', () => {
    removeFromQueue(socket.id);
  });
}

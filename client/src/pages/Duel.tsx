import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { api, extractApiError } from '../api/client';
import { Wordmark } from '../components/Wordmark';

interface MatchPlayer {
  _id: string;
  username: string;
  elo: number;
}

interface MatchPuzzle {
  _id: string;
  type: string;
  date: string;
}

interface DuelMatchData {
  _id: string;
  players: [MatchPlayer, MatchPlayer];
  puzzleId: MatchPuzzle;
  scores: [number | null, number | null];
  winner: string | null;
  status: 'pending' | 'active' | 'finished';
  eloDelta: number;
}

type Phase = 'setup' | 'playing' | 'handoff' | 'waiting' | 'result' | 'not-in-match' | 'loading';

export default function Duel() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const matchId = searchParams.get('match');

  const [phase, setPhase] = useState<Phase>(matchId ? 'loading' : 'setup');
  const [match, setMatch] = useState<DuelMatchData | null>(null);
  const [playerIndex, setPlayerIndex] = useState<0 | 1 | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  // Setup form
  const [opponent, setOpponent] = useState('');
  const [puzzleType, setPuzzleType] = useState<'wordle' | 'connections' | 'grid'>('wordle');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Play state
  const [elapsed, setElapsed] = useState(0);
  const [attempts, setAttempts] = useState(1);
  const [solved, setSolved] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [myScore, setMyScore] = useState<number | null>(null);

  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    const now = Date.now();
    startTimeRef.current = now;
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - now) / 1000));
    }, 500);
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const resolvePhase = useCallback(
    (m: DuelMatchData) => {
      if (m.status === 'finished') {
        setPhase('result');
        return;
      }
      if (!user) return;

      const idx = m.players.findIndex((p) => p._id === user.id);
      if (idx === -1) {
        setPhase('not-in-match');
        return;
      }
      setPlayerIndex(idx as 0 | 1);

      const mySubmitted = m.scores[idx as 0 | 1] !== null;
      const otherIdx = idx === 0 ? 1 : 0;
      const otherSubmitted = m.scores[otherIdx] !== null;

      if (!mySubmitted) {
        // P2 arrived before P1 has gone
        if (idx === 1 && !otherSubmitted) {
          setPhase('waiting');
        } else {
          setPhase('playing');
          startTimer();
        }
      } else {
        setPhase(otherSubmitted ? 'result' : idx === 0 ? 'handoff' : 'waiting');
      }
    },
    [user, startTimer]
  );

  useEffect(() => {
    if (!matchId) {
      setPhase('setup');
      return;
    }
    setPhase('loading');
    api
      .get<{ match: DuelMatchData }>(`/api/duels/${matchId}`)
      .then(({ data }) => {
        setMatch(data.match);
        resolvePhase(data.match);
      })
      .catch((err) => {
        setPageError(extractApiError(err));
        setPhase('setup');
      });
  }, [matchId, resolvePhase]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const { data } = await api.post<{ matchId: string }>('/api/duels/hotseat', {
        opponentUsername: opponent.trim(),
        puzzleType,
      });
      setSearchParams({ match: data.matchId });
    } catch (err) {
      setCreateError(extractApiError(err));
    } finally {
      setCreating(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!match || !startTimeRef.current) return;
    stopTimer();
    setSubmitError(null);
    setSubmitting(true);
    const durationMs = Date.now() - startTimeRef.current;
    try {
      const { data } = await api.post<{
        score: number;
        bothDone: boolean;
        match?: DuelMatchData;
      }>(`/api/duels/${match._id}/submit`, { attempts, durationMs, solved });

      setMyScore(data.score);
      if (data.bothDone && data.match) {
        setMatch(data.match);
        setPhase('result');
      } else {
        if (data.match) setMatch(data.match);
        setPhase(playerIndex === 0 ? 'handoff' : 'waiting');
      }
    } catch (err) {
      setSubmitError(extractApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  const matchUrl = `${window.location.origin}/duel?match=${match?._id ?? matchId ?? ''}`;

  return (
    <div className="min-h-screen bg-cream-50 text-ink">
      <header className="border-b border-ink/10 bg-cream-50">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Wordmark variant="dark" size="sm" />
          <Link
            to="/"
            className="font-mono text-[11px] uppercase tracking-widest text-ink-soft hover:text-ink"
          >
            ← Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        {phase === 'loading' && (
          <div className="grid place-items-center py-32 font-mono text-[11px] uppercase tracking-widest text-ink-soft">
            Loading match…
          </div>
        )}

        {pageError && phase === 'setup' && (
          <div className="mb-6 rounded-2xl border border-flame/30 bg-flame/5 px-4 py-3 text-sm text-flame">
            {pageError}
          </div>
        )}

        {phase === 'setup' && (
          <SetupPhase
            opponent={opponent}
            setOpponent={setOpponent}
            puzzleType={puzzleType}
            setPuzzleType={setPuzzleType}
            onSubmit={handleCreate}
            creating={creating}
            error={createError}
          />
        )}

        {phase === 'playing' && match && (
          <PlayPhase
            match={match}
            playerIndex={playerIndex!}
            elapsed={elapsed}
            attempts={attempts}
            setAttempts={setAttempts}
            solved={solved}
            setSolved={setSolved}
            onSubmit={handleSubmit}
            submitting={submitting}
            error={submitError}
          />
        )}

        {phase === 'handoff' && match && (
          <HandoffPhase match={match} matchUrl={matchUrl} myScore={myScore} />
        )}

        {phase === 'waiting' && match && <WaitingPhase match={match} />}

        {phase === 'result' && match && (
          <ResultPhase match={match} currentUserId={user?.id ?? ''} myScore={myScore} />
        )}

        {phase === 'not-in-match' && (
          <div className="py-32 text-center">
            <p className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">
              You are not a player in this match.
            </p>
            <Link
              to="/duel"
              className="mt-6 inline-block rounded-full bg-ink px-6 py-3 font-display text-sm uppercase tracking-widest text-cream-50"
            >
              Start a new duel
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

/* ---------- Phase components ---------- */

function SetupPhase({
  opponent,
  setOpponent,
  puzzleType,
  setPuzzleType,
  onSubmit,
  creating,
  error,
}: {
  opponent: string;
  setOpponent: (v: string) => void;
  puzzleType: string;
  setPuzzleType: (v: 'wordle' | 'connections' | 'grid') => void;
  onSubmit: (e: React.FormEvent) => void;
  creating: boolean;
  error: string | null;
}) {
  return (
    <div>
      <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-ink-soft">
        Hot-seat duel
      </p>
      <h1 className="mt-2 font-display text-5xl leading-[0.95] text-ink lg:text-6xl">
        Challenge a<br />friend.
      </h1>
      <p className="mt-4 font-mono text-[12px] uppercase tracking-widest text-ink-soft">
        Both players take turns on the same device.
      </p>

      <form onSubmit={onSubmit} className="mt-10 max-w-sm space-y-5">
        {error && (
          <div className="rounded-2xl border border-flame/30 bg-flame/5 px-4 py-3 text-sm text-flame">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block font-mono text-[11px] font-medium uppercase tracking-widest text-ink-soft">
            Opponent username
          </label>
          <input
            type="text"
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
            placeholder="e.g. darius_pm"
            required
            className="w-full rounded-2xl border-2 border-ink bg-cream-50 px-4 py-3 font-mono text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-4 focus:ring-ink/10"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block font-mono text-[11px] font-medium uppercase tracking-widest text-ink-soft">
            Puzzle type
          </label>
          <div className="flex gap-2">
            {(['wordle', 'connections', 'grid'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setPuzzleType(t)}
                className={`rounded-full border-2 px-4 py-2 font-mono text-[11px] uppercase tracking-widest transition-colors ${
                  puzzleType === t
                    ? 'border-ink bg-ink text-cream-50'
                    : 'border-ink/30 bg-cream-50 text-ink-soft hover:border-ink hover:text-ink'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={creating || !opponent.trim()}
          className="w-full rounded-full bg-ink py-4 font-display text-sm uppercase tracking-widest text-cream-50 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {creating ? 'Creating…' : 'Start duel →'}
        </button>
      </form>
    </div>
  );
}

function PlayPhase({
  match,
  playerIndex,
  elapsed,
  attempts,
  setAttempts,
  solved,
  setSolved,
  onSubmit,
  submitting,
  error,
}: {
  match: DuelMatchData;
  playerIndex: 0 | 1;
  elapsed: number;
  attempts: number;
  setAttempts: (v: number) => void;
  solved: boolean;
  setSolved: (v: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  error: string | null;
}) {
  const player = match.players[playerIndex];
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  const puzzleLabel = match.puzzleId.type.charAt(0).toUpperCase() + match.puzzleId.type.slice(1);

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-ink-soft">
            Player {playerIndex + 1} · {player.username}
          </p>
          <h1 className="mt-1 font-display text-4xl text-ink">{puzzleLabel}</h1>
        </div>
        <div className="shrink-0 rounded-2xl border-2 border-ink px-5 py-3 text-center">
          <p className="font-mono text-2xl font-bold tabular-nums text-ink">
            {mm}:{ss}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-soft">Elapsed</p>
        </div>
      </div>

      {/* Puzzle slot — swap in the real component here when ready */}
      <div className="mt-8 flex min-h-48 items-center justify-center rounded-2xl border-2 border-dashed border-ink/20 bg-cream-100">
        <div className="text-center">
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">
            {puzzleLabel} puzzle
          </p>
          <p className="mt-1 text-sm text-ink-soft/60">Component loads here</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        {error && (
          <div className="rounded-2xl border border-flame/30 bg-flame/5 px-4 py-3 text-sm text-flame">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-8">
          <div className="space-y-1.5">
            <label className="block font-mono text-[11px] font-medium uppercase tracking-widest text-ink-soft">
              Attempts used
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAttempts(Math.max(1, attempts - 1))}
                className="grid h-10 w-10 place-items-center rounded-full border-2 border-ink font-display text-lg text-ink hover:bg-ink hover:text-cream-50"
              >
                −
              </button>
              <span className="w-8 text-center font-display text-3xl text-ink">{attempts}</span>
              <button
                type="button"
                onClick={() => setAttempts(attempts + 1)}
                className="grid h-10 w-10 place-items-center rounded-full border-2 border-ink font-display text-lg text-ink hover:bg-ink hover:text-cream-50"
              >
                +
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block font-mono text-[11px] font-medium uppercase tracking-widest text-ink-soft">
              Result
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSolved(true)}
                className={`rounded-full border-2 px-4 py-2 font-mono text-[11px] uppercase tracking-widest transition-colors ${
                  solved
                    ? 'border-pitch-jersey bg-pitch-jersey text-cream-50'
                    : 'border-ink/30 text-ink-soft hover:border-ink hover:text-ink'
                }`}
              >
                Solved
              </button>
              <button
                type="button"
                onClick={() => setSolved(false)}
                className={`rounded-full border-2 px-4 py-2 font-mono text-[11px] uppercase tracking-widest transition-colors ${
                  !solved
                    ? 'border-flame bg-flame text-cream-50'
                    : 'border-ink/30 text-ink-soft hover:border-ink hover:text-ink'
                }`}
              >
                Failed
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-ink py-4 font-display text-sm uppercase tracking-widest text-cream-50 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit score →'}
        </button>
      </form>
    </div>
  );
}

function HandoffPhase({
  match,
  matchUrl,
  myScore,
}: {
  match: DuelMatchData;
  matchUrl: string;
  myScore: number | null;
}) {
  const opponent = match.players[1];
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(matchUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="py-4">
      {myScore !== null && (
        <div className="mb-8 inline-flex items-center gap-4 rounded-2xl border-2 border-ink bg-gold px-6 py-4">
          <span className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">
            Your score
          </span>
          <span className="font-display text-4xl text-ink">{myScore}</span>
        </div>
      )}

      <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-ink-soft">
        Your turn is done!
      </p>
      <h1 className="mt-2 font-display text-5xl leading-[0.95] text-ink">
        Pass to<br />{opponent.username}.
      </h1>
      <p className="mt-4 font-mono text-[12px] uppercase tracking-widest text-ink-soft">
        Have {opponent.username} open this link and log in to take their turn.
      </p>

      <div className="mt-8 flex items-center gap-3">
        <div className="flex-1 truncate rounded-2xl border-2 border-ink/20 bg-cream-100 px-4 py-3 font-mono text-sm text-ink-soft">
          {matchUrl}
        </div>
        <button
          onClick={copy}
          className="shrink-0 rounded-full border-2 border-ink bg-cream-50 px-5 py-3 font-mono text-[11px] uppercase tracking-widest text-ink transition-transform hover:-translate-y-0.5"
        >
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}

function WaitingPhase({ match }: { match: DuelMatchData }) {
  const [checking, setChecking] = useState(false);

  async function refresh() {
    setChecking(true);
    try {
      const { data } = await api.get<{ match: DuelMatchData }>(`/api/duels/${match._id}`);
      if (data.match.status === 'finished') {
        window.location.reload();
      }
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="py-8 text-center">
      <div className="mx-auto mb-8 h-14 w-14 animate-spin rounded-full border-4 border-ink/10 border-t-ink" />
      <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-ink-soft">
        Waiting for
      </p>
      <h2 className="mt-2 font-display text-5xl text-ink">{match.players[0].username}</h2>
      <p className="mt-2 font-mono text-[12px] uppercase tracking-widest text-ink-soft">
        to take their turn…
      </p>
      <button
        onClick={refresh}
        disabled={checking}
        className="mt-8 rounded-full border-2 border-ink px-6 py-3 font-display text-sm uppercase tracking-widest text-ink transition-transform hover:-translate-y-0.5 disabled:opacity-50"
      >
        {checking ? 'Checking…' : 'Check result'}
      </button>
    </div>
  );
}

function ResultPhase({
  match,
  currentUserId,
  myScore,
}: {
  match: DuelMatchData;
  currentUserId: string;
  myScore: number | null;
}) {
  const [p0, p1] = match.players;
  const [score0, score1] = match.scores as [number, number];
  const isDraw = !match.winner;
  const iWon = match.winner === currentUserId;
  const winner = match.players.find((p) => p._id === match.winner);

  void myScore; // available for future use

  return (
    <div>
      <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-gold-dark">
        Match over
      </p>
      <h1 className="mt-2 font-display text-5xl leading-[0.95] text-ink lg:text-6xl">
        {isDraw ? "It's a draw." : iWon ? 'You win!' : `${winner?.username ?? 'Opponent'} wins.`}
      </h1>

      <div className="mt-10 grid grid-cols-2 gap-4">
        <ScoreCard
          username={p0.username}
          score={score0}
          elo={p0.elo}
          isWinner={match.winner === p0._id}
        />
        <ScoreCard
          username={p1.username}
          score={score1}
          elo={p1.elo}
          isWinner={match.winner === p1._id}
        />
      </div>

      {match.eloDelta > 0 && (
        <div className="mt-6 rounded-2xl border-2 border-ink/10 bg-cream-100 px-6 py-4">
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">
            ELO change
          </p>
          <p className="mt-1 font-display text-3xl text-ink">
            {iWon ? '+' : isDraw ? '±' : '−'}
            {match.eloDelta} pts
          </p>
        </div>
      )}

      <div className="mt-8 flex gap-3">
        <Link
          to="/duel"
          className="rounded-full bg-ink px-6 py-3 font-display text-sm uppercase tracking-widest text-cream-50 transition-transform hover:-translate-y-0.5"
        >
          New duel
        </Link>
        <Link
          to="/"
          className="rounded-full border-2 border-ink px-6 py-3 font-display text-sm uppercase tracking-widest text-ink transition-transform hover:-translate-y-0.5"
        >
          Home
        </Link>
      </div>
    </div>
  );
}

function ScoreCard({
  username,
  score,
  elo,
  isWinner,
}: {
  username: string;
  score: number;
  elo: number;
  isWinner: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border-2 p-5 ${
        isWinner ? 'border-gold bg-gold' : 'border-ink/20 bg-cream-100'
      }`}
    >
      {isWinner && (
        <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-ink">
          ★ Winner
        </p>
      )}
      <p className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">{username}</p>
      <p className="mt-1 font-display text-4xl text-ink">{score}</p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-ink/40">
        ELO {elo}
      </p>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { api, extractApiError } from '../api/client';
import { connectSocket, disconnectSocket, getSocket } from '../socket/socket';
import { Wordmark } from '../components/Wordmark';
import { GridGame, ConnectionsGame, WordleGame, type ApiPuzzle, type DuelCompleteData } from './PuzzlePlay';

// ── Types ────────────────────────────────────────────────────────────────────

interface MatchPlayer {
  _id: string;
  username: string;
  elo: number;
}

interface DuelMatchData {
  _id: string;
  players: [MatchPlayer, MatchPlayer];
  puzzleId: ApiPuzzle;
  scores: [number | null, number | null];
  winner: string | null;
  status: 'pending' | 'active' | 'finished';
  eloDelta: number;
  mode: 'hotseat' | 'online';
}

type PuzzleType = 'grid' | 'connections' | 'wordle';
type LobbyTab = 'quickplay' | 'invite';
type Phase =
  | 'lobby'
  | 'queuing'
  | 'playing'        // hotseat P1 or P2 turn
  | 'handoff'        // hotseat P1 done, pass device
  | 'waiting'        // hotseat P2 waiting for P1
  | 'online-playing' // real-time online match
  | 'result'
  | 'not-in-match'
  | 'loading';

// ── Main component ───────────────────────────────────────────────────────────

export default function Duel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const matchId = searchParams.get('match');

  const joinToken = searchParams.get('join');

  const [phase, setPhase] = useState<Phase>(matchId ? 'loading' : 'lobby');
  const [match, setMatch] = useState<DuelMatchData | null>(null);
  const [playerIndex, setPlayerIndex] = useState<0 | 1 | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  // Lobby state
  const [lobbyTab, setLobbyTab] = useState<LobbyTab>('quickplay');
  const [puzzleType, setPuzzleType] = useState<PuzzleType>('grid');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Invite link state
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [pendingMatchId, setPendingMatchId] = useState<string | null>(null);

  // Queue state
  const [queuePosition, setQueuePosition] = useState(0);

  // Play state
  const [elapsed, setElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [myScore, setMyScore] = useState<number | null>(null);
  const [opponentScore, setOpponentScore] = useState<number | null>(null);
  const [forfeitedBy, setForfeitedBy] = useState<string | null>(null);

  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startTimer = useCallback(() => {
    const now = Date.now();
    startTimeRef.current = now;
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - now) / 1000)), 500);
  }, []);

  useEffect(() => () => { stopTimer(); disconnectSocket(); }, [stopTimer]);

  // ── Resolve hotseat phase from match data ──────────────────────────────
  const resolveHotseatPhase = useCallback(
    (m: DuelMatchData) => {
      if (m.status === 'finished') { setPhase('result'); return; }
      if (!user) return;
      const idx = m.players.findIndex((p) => p._id === user.id);
      if (idx === -1) { setPhase('not-in-match'); return; }
      setPlayerIndex(idx as 0 | 1);
      const myDone = m.scores[idx as 0 | 1] !== null;
      const otherDone = m.scores[idx === 0 ? 1 : 0] !== null;
      if (!myDone) {
        if (idx === 1 && !otherDone) { setPhase('waiting'); }
        else { setPhase('playing'); startTimer(); }
      } else {
        setPhase(otherDone ? 'result' : idx === 0 ? 'handoff' : 'waiting');
      }
    },
    [user, startTimer],
  );

  // ── Load match from URL param ──────────────────────────────────────────
  useEffect(() => {
    if (!matchId) { setPhase('lobby'); return; }
    setPhase('loading');
    api.get<{ match: DuelMatchData }>(`/api/duels/${matchId}`)
      .then(({ data }) => {
        setMatch(data.match);
        if (data.match.mode === 'online') {
          const idx = data.match.players.findIndex((p) => p._id === user?.id);
          setPlayerIndex(idx as 0 | 1);
          setPhase('online-playing');
          startTimer();
          const socket = connectSocket();
          socket.emit('duel:join:room', { matchId: data.match._id });
        } else {
          resolveHotseatPhase(data.match);
        }
      })
      .catch((err) => { setPageError(extractApiError(err)); setPhase('lobby'); });
  }, [matchId, resolveHotseatPhase, user?.id, startTimer]);

  // ── Socket listeners for online mode ──────────────────────────────────
  useEffect(() => {
    const socket = getSocket();

    socket.on('duel:queue:waiting', (data: { position: number }) => {
      setQueuePosition(data.position);
    });

    socket.on('duel:match:found', (data: { matchId: string; match?: DuelMatchData; players: { userId: string; username: string; elo: number }[] }) => {
      setSearchParams({ match: data.matchId });
      // The useEffect above will handle loading the match
    });

    socket.on('duel:score:update', (data: { playerIndex: number; score: number }) => {
      setMatch((prev) => {
        if (!prev) return prev;
        const scores = [...prev.scores] as [number | null, number | null];
        scores[data.playerIndex] = data.score;
        return { ...prev, scores };
      });
      if (playerIndex !== null && data.playerIndex !== playerIndex) {
        setOpponentScore(data.score);
      }
    });

    socket.on('duel:finished', (data: { match: DuelMatchData; forfeitedBy?: string }) => {
      setMatch(data.match);
      setForfeitedBy(data.forfeitedBy ?? null);
      stopTimer();
      setPhase('result');
    });

    socket.on('duel:queue:left', () => setPhase('lobby'));

    socket.on('duel:error', (data: { message: string }) => {
      setCreateError(data.message);
      setPhase('lobby');
    });

    return () => {
      socket.off('duel:queue:waiting');
      socket.off('duel:match:found');
      socket.off('duel:score:update');
      socket.off('duel:finished');
      socket.off('duel:queue:left');
      socket.off('duel:error');
    };
  }, [playerIndex, stopTimer, setSearchParams]);

  // ── Join via invite token (e.g. /duel?join=<token>) ───────────────────
  useEffect(() => {
    if (!joinToken) return;
    setPhase('loading');
    api.post<{ matchId: string }>(`/api/duels/join/${joinToken}`)
      .then(({ data }) => setSearchParams({ match: data.matchId }))
      .catch((err) => { setPageError(extractApiError(err)); setPhase('lobby'); });
  }, [joinToken, setSearchParams]);

  // ── Actions ────────────────────────────────────────────────────────────

  async function handleCreateInvite() {
    setCreateError(null);
    setCreating(true);
    try {
      const { data } = await api.post<{ matchId: string; inviteToken: string }>('/api/duels/invite', { puzzleType });
      setInviteToken(data.inviteToken);
      setPendingMatchId(data.matchId);
    } catch (err) {
      setCreateError(extractApiError(err));
    } finally {
      setCreating(false);
    }
  }

  function handleStartInvitePlay() {
    if (!pendingMatchId) return;
    setSearchParams({ match: pendingMatchId });
  }

  function handleQuickplay() {
    setCreateError(null);
    const socket = connectSocket();
    socket.emit('duel:queue:join', { puzzleType });
    setPhase('queuing');
  }

  function handleLeaveQueue() {
    getSocket().emit('duel:queue:leave');
  }

  async function handleDuelComplete({ attempts, durationMs, solved }: DuelCompleteData) {
    if (!match) return;
    stopTimer();
    setSubmitError(null);
    if (phase === 'online-playing') {
      getSocket().emit('duel:score:submit', { matchId: match._id, attempts, durationMs, solved });
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post<{ score: number; bothDone: boolean; match?: DuelMatchData }>(
        `/api/duels/${match._id}/submit`,
        { attempts, durationMs, solved },
      );
      setMyScore(data.score);
      if (data.bothDone && data.match) { setMatch(data.match); setPhase('result'); }
      else { if (data.match) setMatch(data.match); setPhase(playerIndex === 0 ? 'handoff' : 'waiting'); }
    } catch (err) {
      setSubmitError(extractApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  function handleForfeit() {
    if (!match) return;
    getSocket().emit('duel:forfeit', { matchId: match._id });
  }

  const matchUrl = inviteToken
    ? `${window.location.origin}/duel?join=${inviteToken}`
    : `${window.location.origin}/duel?match=${match?._id ?? matchId ?? ''}`;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-cream-50 text-ink">
      <header className="border-b border-ink/10 bg-cream-50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Wordmark variant="dark" size="sm" />
          <Link to="/" className="font-mono text-[11px] uppercase tracking-widest text-ink-soft hover:text-ink">
            ← Today
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {phase === 'loading' && (
          <div className="grid place-items-center py-32 font-mono text-[11px] uppercase tracking-widest text-ink-soft">
            Loading match…
          </div>
        )}

        {pageError && phase === 'lobby' && (
          <div className="mb-6 rounded-2xl border border-flame/30 bg-flame/5 px-4 py-3 text-sm text-flame">
            {pageError}
          </div>
        )}

        {phase === 'lobby' && (
          <LobbyPhase
            user={user}
            puzzleType={puzzleType}
            setPuzzleType={setPuzzleType}
            lobbyTab={lobbyTab}
            setLobbyTab={setLobbyTab}
            inviteLink={inviteToken ? `${window.location.origin}/duel?join=${inviteToken}` : null}
            onQuickplay={handleQuickplay}
            onCreateInvite={handleCreateInvite}
            onStartInvitePlay={handleStartInvitePlay}
            creating={creating}
            error={createError}
          />
        )}

        {phase === 'queuing' && (
          <QueuingPhase
            puzzleType={puzzleType}
            position={queuePosition}
            onLeave={handleLeaveQueue}
          />
        )}

        {(phase === 'playing' || phase === 'online-playing') && match && (
          <LivePhase
            match={match}
            playerIndex={playerIndex!}
            elapsed={elapsed}
            myScore={myScore}
            opponentScore={opponentScore}
            isOnline={phase === 'online-playing'}
            onDuelComplete={handleDuelComplete}
            onForfeit={handleForfeit}
            submitting={submitting}
            error={submitError}
          />
        )}

        {phase === 'handoff' && match && (
          <HandoffPhase match={match} matchUrl={matchUrl} myScore={myScore} />
        )}

        {phase === 'waiting' && match && <WaitingPhase match={match} />}

        {phase === 'result' && match && (
          <ResultPhase
            match={match}
            currentUserId={user?.id ?? ''}
            myScore={myScore}
            forfeitedBy={forfeitedBy}
            onNewDuel={() => { setMatch(null); setMyScore(null); setOpponentScore(null); setForfeitedBy(null); setPhase('lobby'); navigate('/duel'); }}
          />
        )}

        {phase === 'not-in-match' && (
          <div className="py-32 text-center">
            <p className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">
              You are not a player in this match.
            </p>
            <button
              onClick={() => { setPhase('lobby'); navigate('/duel'); }}
              className="mt-6 inline-block rounded-full bg-ink px-6 py-3 font-display text-sm uppercase tracking-widest text-cream-50"
            >
              Start a new duel
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Lobby ────────────────────────────────────────────────────────────────────

function LobbyPhase({
  user,
  puzzleType,
  setPuzzleType,
  lobbyTab,
  setLobbyTab,
  inviteLink,
  onQuickplay,
  onCreateInvite,
  onStartInvitePlay,
  creating,
  error,
}: {
  user: { username: string; elo: number; streak: number } | null;
  puzzleType: PuzzleType;
  setPuzzleType: (t: PuzzleType) => void;
  lobbyTab: LobbyTab;
  setLobbyTab: (t: LobbyTab) => void;
  inviteLink: string | null;
  onQuickplay: () => void;
  onCreateInvite: () => void;
  onStartInvitePlay: () => void;
  creating: boolean;
  error: string | null;
}) {
  return (
    <div>
      <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-ink-soft">
        1v1 Duel
      </p>
      <h1 className="mt-2 font-display text-6xl leading-[0.95] text-ink lg:text-7xl">
        Pick your side.
      </h1>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {/* ── Your stats card ── */}
        <div className="rounded-2xl border-2 border-pitch-jersey bg-pitch-jersey/5 p-6">
          <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-pitch-jersey">
            You
          </p>
          <div className="mt-3 flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-full border-2 border-ink bg-gold font-display text-xl text-ink">
              {(user?.username ?? '??').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-display text-2xl text-ink">{user?.username ?? '—'}</p>
              <p className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">
                ELO {user?.elo ?? 1000}
              </p>
            </div>
          </div>
          <div className="mt-5 flex gap-5 border-t border-ink/10 pt-4">
            <Stat label="Streak" value={`${user?.streak ?? 0} 🔥`} />
          </div>

          {/* Puzzle picker */}
          <div className="mt-6">
            <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-widest text-ink-soft">
              Choose puzzle
            </p>
            <div className="flex gap-2">
              {(['grid', 'connections', 'wordle'] as PuzzleType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPuzzleType(t)}
                  className={`rounded-full border-2 px-4 py-2 font-mono text-[11px] uppercase tracking-widest transition-colors ${
                    puzzleType === t
                      ? 'border-ink bg-ink text-cream-50'
                      : 'border-ink/20 text-ink-soft hover:border-ink hover:text-ink'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Opponent selector ── */}
        <div className="rounded-2xl border-2 border-ink/10 bg-cream-100 p-6">
          <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-ink-soft">
            Opponent
          </p>

          {/* Tabs */}
          <div className="mt-3 flex gap-1 rounded-full border-2 border-ink/10 bg-cream-50 p-1">
            {(['quickplay', 'invite'] as LobbyTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setLobbyTab(tab)}
                className={`flex-1 rounded-full py-2 font-mono text-[11px] uppercase tracking-widest transition-colors ${
                  lobbyTab === tab
                    ? 'bg-ink text-cream-50'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                {tab === 'quickplay' ? 'Quickplay' : 'Invite'}
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-flame/30 bg-flame/5 px-3 py-2 text-sm text-flame">
              {error}
            </div>
          )}

          {lobbyTab === 'quickplay' && (
            <div className="mt-5">
              <div className="rounded-xl border-2 border-dashed border-ink/20 p-5 text-center">
                <p className="font-display text-xl text-ink">Anyone</p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-ink-soft">
                  Matchmade by ELO ±150
                </p>
              </div>
              <button
                type="button"
                onClick={onQuickplay}
                className="mt-4 w-full rounded-full bg-gold py-4 font-display text-sm uppercase tracking-widest text-ink shadow-card-lift transition-transform hover:-translate-y-0.5"
              >
                Find Match
              </button>
            </div>
          )}

          {lobbyTab === 'invite' && (
            <InviteTab
              inviteLink={inviteLink}
              creating={creating}
              onCreateInvite={onCreateInvite}
              onStartInvitePlay={onStartInvitePlay}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Invite tab ───────────────────────────────────────────────────────────────

function InviteTab({
  inviteLink,
  creating,
  onCreateInvite,
  onStartInvitePlay,
}: {
  inviteLink: string | null;
  creating: boolean;
  onCreateInvite: () => void;
  onStartInvitePlay: () => void;
}) {
  const [copied, setCopied] = useState(false);
  function copy() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!inviteLink) {
    return (
      <div className="mt-5 space-y-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">
          Generate a link and send it to your opponent. You play first, they follow.
        </p>
        <button
          type="button"
          onClick={onCreateInvite}
          disabled={creating}
          className="w-full rounded-full bg-ink py-4 font-display text-sm uppercase tracking-widest text-cream-50 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {creating ? 'Creating…' : 'Create Invite Link'}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-ink-soft">
        Share this link with your opponent
      </p>
      <div className="flex items-center gap-3">
        <div className="flex-1 truncate rounded-2xl border-2 border-ink/20 bg-cream-50 px-4 py-3 font-mono text-sm text-ink-soft">
          {inviteLink}
        </div>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-full border-2 border-ink bg-cream-50 px-5 py-3 font-mono text-[11px] uppercase tracking-widest text-ink transition-transform hover:-translate-y-0.5"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <button
        type="button"
        onClick={onStartInvitePlay}
        className="w-full rounded-full bg-gold py-4 font-display text-sm uppercase tracking-widest text-ink shadow-card-lift transition-transform hover:-translate-y-0.5"
      >
        Start Your Turn →
      </button>
    </div>
  );
}

// ── Queuing ──────────────────────────────────────────────────────────────────

function QueuingPhase({
  puzzleType,
  position,
  onLeave,
}: {
  puzzleType: PuzzleType;
  position: number;
  onLeave: () => void;
}) {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d.length >= 3 ? '' : d + '.')), 500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col items-center py-24 text-center">
      <div className="mb-8 h-16 w-16 animate-spin rounded-full border-4 border-ink/10 border-t-gold" />
      <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-gold-dark">
        1v1 Duel · {puzzleType}
      </p>
      <h2 className="mt-3 font-display text-5xl text-ink">
        Finding a rival{dots}
      </h2>
      <p className="mt-3 font-mono text-[12px] uppercase tracking-widest text-ink-soft">
        {position} player{position !== 1 ? 's' : ''} in queue · ELO ±150
      </p>
      <button
        type="button"
        onClick={onLeave}
        className="mt-10 rounded-full border-2 border-ink px-6 py-3 font-display text-sm uppercase tracking-widest text-ink transition-transform hover:-translate-y-0.5"
      >
        Leave Queue
      </button>
    </div>
  );
}

// ── Live (hotseat + online) ───────────────────────────────────────────────────

function LivePhase({
  match,
  playerIndex,
  elapsed,
  myScore,
  opponentScore,
  isOnline,
  onDuelComplete,
  onForfeit,
  submitting,
  error,
}: {
  match: DuelMatchData;
  playerIndex: 0 | 1;
  elapsed: number;
  myScore: number | null;
  opponentScore: number | null;
  isOnline: boolean;
  onDuelComplete: (d: DuelCompleteData) => void;
  onForfeit: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const me = match.players[playerIndex];
  const opponent = match.players[playerIndex === 0 ? 1 : 0];
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  const puzzleType = match.puzzleId.type as 'grid' | 'connections' | 'wordle';
  const puzzleLabel = puzzleType.charAt(0).toUpperCase() + puzzleType.slice(1);
  const submitted = myScore !== null;

  void submitting;

  return (
    <div>
      {/* Player header */}
      <div className="flex items-stretch gap-0 overflow-hidden rounded-2xl border-2 border-ink">
        <div className="flex flex-1 items-center gap-3 bg-pitch-jersey px-5 py-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-cream-50/30 bg-pitch-jersey/80 font-display text-sm text-cream-50">
            {me.username.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-display text-lg text-cream-50">{me.username}</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-cream-50/60">ELO {me.elo}</p>
          </div>
          {myScore !== null && (
            <span className="ml-auto font-display text-3xl text-cream-50">{myScore}</span>
          )}
        </div>

        <div className="flex flex-col items-center justify-center bg-ink px-6 py-3 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-cream-50/50">
            {isOnline ? 'Live' : 'Hot-seat'}
          </p>
          <p className="font-display text-2xl tabular-nums text-cream-50">{mm}:{ss}</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-cream-50/50">{puzzleLabel}</p>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3 bg-flame px-5 py-4">
          {opponentScore !== null && (
            <span className="mr-auto font-display text-3xl text-cream-50">{opponentScore}</span>
          )}
          <div className="text-right">
            <p className="font-display text-lg text-cream-50">{opponent.username}</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-cream-50/60">ELO {opponent.elo}</p>
          </div>
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-cream-50/30 bg-flame/80 font-display text-sm text-cream-50">
            {opponent.username.slice(0, 2).toUpperCase()}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-flame/30 bg-flame/5 px-4 py-3 text-sm text-flame">
          {error}
        </div>
      )}

      {/* Game area */}
      {submitted ? (
        <div className="mt-6 rounded-2xl border-2 border-gold bg-gold/10 px-6 py-4">
          <p className="font-mono text-[11px] uppercase tracking-widest text-gold-dark">Score submitted</p>
          <p className="mt-1 font-display text-4xl text-ink">{myScore}</p>
          {isOnline && (
            <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-ink-soft">
              Waiting for {opponent.username}…
            </p>
          )}
        </div>
      ) : (
        <div className="mt-6">
          {puzzleType === 'grid' && (
            <GridGame puzzle={match.puzzleId} usingDemo={false} onDuelComplete={onDuelComplete} />
          )}
          {puzzleType === 'connections' && (
            <ConnectionsGame puzzle={match.puzzleId} usingDemo={false} onDuelComplete={onDuelComplete} />
          )}
          {puzzleType === 'wordle' && (
            <WordleGame puzzle={match.puzzleId} usingDemo={false} onDuelComplete={onDuelComplete} />
          )}
        </div>
      )}

      {isOnline && !submitted && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onForfeit}
            className="rounded-full border-2 border-flame px-5 py-3 font-display text-sm uppercase tracking-widest text-flame transition-transform hover:-translate-y-0.5"
          >
            Forfeit
          </button>
        </div>
      )}
    </div>
  );
}

// ── Handoff ──────────────────────────────────────────────────────────────────

function HandoffPhase({ match, matchUrl, myScore }: { match: DuelMatchData; matchUrl: string; myScore: number | null }) {
  const opponent = match.players[1];
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(matchUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }
  return (
    <div className="py-4">
      {myScore !== null && (
        <div className="mb-8 inline-flex items-center gap-4 rounded-2xl border-2 border-ink bg-gold px-6 py-4">
          <span className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">Your score</span>
          <span className="font-display text-4xl text-ink">{myScore}</span>
        </div>
      )}
      <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-ink-soft">Your turn is done!</p>
      <h1 className="mt-2 font-display text-5xl leading-[0.95] text-ink">
        Pass to<br />{opponent.username}.
      </h1>
      <p className="mt-4 font-mono text-[12px] uppercase tracking-widest text-ink-soft">
        Have {opponent.username} open this link and log in.
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

// ── Waiting ───────────────────────────────────────────────────────────────────

function WaitingPhase({ match }: { match: DuelMatchData }) {
  const [checking, setChecking] = useState(false);
  async function refresh() {
    setChecking(true);
    try {
      const { data } = await api.get<{ match: DuelMatchData }>(`/api/duels/${match._id}`);
      if (data.match.status === 'finished') window.location.reload();
    } finally {
      setChecking(false);
    }
  }
  return (
    <div className="py-8 text-center">
      <div className="mx-auto mb-8 h-14 w-14 animate-spin rounded-full border-4 border-ink/10 border-t-ink" />
      <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-ink-soft">Waiting for</p>
      <h2 className="mt-2 font-display text-5xl text-ink">{match.players[0].username}</h2>
      <p className="mt-2 font-mono text-[12px] uppercase tracking-widest text-ink-soft">to take their turn…</p>
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

// ── Result ────────────────────────────────────────────────────────────────────

function ResultPhase({
  match,
  currentUserId,
  myScore,
  forfeitedBy,
  onNewDuel,
}: {
  match: DuelMatchData;
  currentUserId: string;
  myScore: number | null;
  forfeitedBy: string | null;
  onNewDuel: () => void;
}) {
  const [p0, p1] = match.players;
  const [score0, score1] = match.scores as [number, number];
  const isDraw = !match.winner;
  const iWon = match.winner === currentUserId;
  const winner = match.players.find((p) => p._id === match.winner);
  const didForfeit = forfeitedBy === currentUserId;

  void myScore;

  return (
    <div>
      {/* Golazo banner */}
      <div className="mb-8 rounded-2xl border-2 border-ink bg-cream-50 px-8 py-8 shadow-card-lift">
        <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-ink-soft">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}
        </p>
        <h1 className="mt-2 font-display text-6xl leading-[0.95] text-ink lg:text-7xl">
          {didForfeit ? 'Forfeit.' : isDraw ? 'Draw.' : iWon ? 'Golazo!' : `${winner?.username ?? 'Opponent'} wins.`}
        </h1>
        {!isDraw && !didForfeit && (
          <p className="mt-3 font-mono text-[12px] uppercase tracking-widest text-ink-soft">
            {iWon ? 'You won this one.' : 'Better luck next time.'}
          </p>
        )}
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-2 gap-4">
        <ScoreCard username={p0.username} score={score0} elo={p0.elo} isWinner={match.winner === p0._id} />
        <ScoreCard username={p1.username} score={score1} elo={p1.elo} isWinner={match.winner === p1._id} />
      </div>

      {/* ELO change */}
      {match.eloDelta > 0 && (
        <div className="mt-5 rounded-2xl border-2 border-ink/10 bg-cream-100 px-6 py-4">
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">ELO change</p>
          <p className="mt-1 font-display text-3xl text-ink">
            {iWon ? '+' : isDraw ? '±' : '−'}{match.eloDelta} pts
          </p>
        </div>
      )}

      <div className="mt-8 flex gap-3">
        <button
          onClick={onNewDuel}
          className="rounded-full bg-ink px-6 py-3 font-display text-sm uppercase tracking-widest text-cream-50 transition-transform hover:-translate-y-0.5"
        >
          New duel
        </button>
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

function ScoreCard({ username, score, elo, isWinner }: { username: string; score: number; elo: number; isWinner: boolean }) {
  return (
    <div className={`rounded-2xl border-2 p-5 ${isWinner ? 'border-gold bg-gold' : 'border-ink/20 bg-cream-100'}`}>
      {isWinner && <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-ink">★ Winner</p>}
      <p className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">{username}</p>
      <p className="mt-1 font-display text-4xl text-ink">{score ?? '—'}</p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-ink/40">ELO {elo}</p>
    </div>
  );
}

// ── Shared ────────────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-soft">{label}</p>
      <p className="font-display text-xl text-ink">{value}</p>
    </div>
  );
}

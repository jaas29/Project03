import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { api, extractApiError } from '../api/client';
import { Wordmark } from '../components/Wordmark';
import type { PuzzleType } from '../types/puzzle';

type RoutePuzzleType = Extract<PuzzleType, 'grid' | 'connections' | 'wordle'>;

interface ApiPuzzle {
  _id: string;
  date: string;
  type: PuzzleType;
  payload: unknown;
}

interface TodayResponse {
  date: string;
  puzzles: ApiPuzzle[];
}

interface GridPayload {
  rows: string[];
  cols: string[];
  teamMeta: Record<string, { name: string; crest: string }>;
}

interface GridGuess {
  value: string;
  revealed: boolean;
}

const ROUTE_TYPES = ['grid', 'connections', 'wordle'] as const;

const DEMO_GRID: ApiPuzzle = {
  _id: 'demo-grid',
  date: new Date().toISOString().slice(0, 10),
  type: 'grid',
  payload: {
    rows: ['BRA', 'UCL', 'FW'],
    cols: ['RMA', 'LIV', 'BAY'],
    teamMeta: {
      RMA: { name: 'Real Madrid', crest: '' },
      LIV: { name: 'Liverpool', crest: '' },
      BAY: { name: 'Bayern Munich', crest: '' },
    },
  } satisfies GridPayload,
};

export default function PuzzlePlay() {
  const { type } = useParams();
  const puzzleType = type as RoutePuzzleType;
  const [puzzles, setPuzzles] = useState<ApiPuzzle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get<TodayResponse>('/api/puzzles/today')
      .then((res) => {
        setPuzzles(res.data.puzzles);
        setError(null);
      })
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  if (!ROUTE_TYPES.includes(puzzleType)) return <Navigate to="/" replace />;

  const puzzle = puzzles.find((candidate) => candidate.type === puzzleType);
  const playablePuzzle = puzzleType === 'grid' ? puzzle ?? DEMO_GRID : puzzle;

  return (
    <div className="min-h-screen bg-cream-200 text-ink">
      <header className="border-b-2 border-ink bg-cream-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Wordmark variant="dark" size="sm" />
          <div className="flex items-center gap-3">
            <Link to="/" className="rounded-full border-2 border-ink px-4 py-2 font-display text-[11px] uppercase tracking-widest text-ink">
              Today
            </Link>
            <button className="rounded-full bg-ink px-4 py-2 font-display text-[11px] uppercase tracking-widest text-cream-50">
              Submit
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {loading && <PageNotice title="Loading fixture." detail="Getting today's set from the API." />}
        {error && <PageNotice title="API is late." detail={error} tone="error" />}

        {!loading && puzzleType === 'grid' && playablePuzzle && (
          <GridGame puzzle={playablePuzzle} usingDemo={!puzzle} />
        )}

        {!loading && puzzleType !== 'grid' && (
          <ComingSoonGame type={puzzleType} hasPuzzle={Boolean(playablePuzzle)} />
        )}
      </main>
    </div>
  );
}

function GridGame({ puzzle, usingDemo }: { puzzle: ApiPuzzle; usingDemo: boolean }) {
  const payload = puzzle.payload as GridPayload;
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [guesses, setGuesses] = useState<Record<string, GridGuess>>({});
  const [entry, setEntry] = useState('');
  const [startedAt] = useState(() => Date.now());
  const [score, setScore] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const completed = Object.keys(guesses).filter((key) => guesses[key]?.value.trim()).length;
  const attempts = Math.max(1, completed);
  const selectedGuess = selectedKey ? guesses[selectedKey]?.value ?? '' : '';

  const rows = payload.rows.slice(0, 3);
  const cols = payload.cols.slice(0, 3);

  useEffect(() => {
    if (!selectedKey) return;
    setEntry(selectedGuess);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [selectedKey, selectedGuess]);

  function saveGuess() {
    if (!selectedKey || !entry.trim()) return;
    setGuesses((current) => ({
      ...current,
      [selectedKey]: { value: entry.trim(), revealed: true },
    }));
    setSelectedKey(null);
    setEntry('');
  }

  async function submitScore() {
    setSubmitError(null);
    const durationMs = Date.now() - startedAt;
    if (usingDemo) {
      setScore(Math.max(0, 900 - (9 - completed) * 75));
      return;
    }

    try {
      const { data } = await api.post<{ score: number }>(`/api/puzzles/${puzzle._id}/submit`, {
        attempts,
        durationMs,
        solved: completed === 9,
      });
      setScore(data.score);
    } catch (err) {
      setSubmitError(extractApiError(err));
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
      <section>
        <Link to="/" className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink-soft">
          Back to today
        </Link>
        <h1 className="mt-2 font-display text-6xl leading-[0.95] text-ink lg:text-7xl">
          Football Grid
        </h1>
        <p className="mt-2 max-w-md text-sm text-ink-soft">
          Find a player matching each row and column.
        </p>

        {usingDemo && (
          <div className="mt-5 inline-flex rounded-full border-2 border-gold bg-gold/20 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-gold-dark">
            Demo grid while API grid is unavailable
          </div>
        )}

        <div className="mt-8 rounded-2xl border-4 border-ink bg-cream-50 p-5 shadow-card-lift">
          <div className="grid grid-cols-[88px_repeat(3,minmax(0,1fr))] gap-3">
            <div className="flex items-end justify-center pb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-ink-soft">
              Rows x Cols
            </div>
            {cols.map((col) => (
              <GridHeader key={col} label={col} helper={payload.teamMeta[col]?.name ?? col} />
            ))}

            {rows.map((row) => (
              <RowFragment
                key={row}
                row={row}
                cols={cols}
                guesses={guesses}
                onSelect={setSelectedKey}
              />
            ))}
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <ScorePanel completed={completed} score={score} error={submitError} onSubmit={submitScore} />
        <div className="rounded-2xl border-4 border-ink bg-cream-100 p-5 shadow-card-lift">
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink">Hints</p>
          <p className="mt-3 text-sm leading-6 text-ink-soft">
            Stuck? Use the row and club abbreviation together. A good guess can be active, retired,
            or recently transferred.
          </p>
        </div>
      </aside>

      {selectedKey && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 px-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveGuess();
            }}
            className="w-full max-w-md rounded-none border-4 border-ink bg-cream-50 p-6 shadow-card-lift"
          >
            <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-gold-dark">
              Cell {selectedKey.replace(',', ' x ')}
            </p>
            <h2 className="mt-1 font-display text-4xl text-ink">Name the player.</h2>
            <input
              ref={inputRef}
              value={entry}
              onChange={(event) => setEntry(event.target.value)}
              placeholder="e.g. Cristiano Ronaldo"
              className="mt-5 w-full rounded-2xl border-4 border-ink bg-cream-50 px-4 py-4 font-display text-lg text-ink placeholder:font-sans placeholder:text-sm placeholder:text-ink/35 focus:outline-none focus:ring-4 focus:ring-gold/40"
            />
            <div className="mt-5 flex gap-3">
              <button
                type="submit"
                className="flex-1 rounded-full bg-ink px-5 py-3 font-display text-sm uppercase tracking-widest text-cream-50"
              >
                Lock answer
              </button>
              <button
                type="button"
                onClick={() => setSelectedKey(null)}
                className="rounded-full border-2 border-ink px-5 py-3 font-display text-sm uppercase tracking-widest text-ink"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function RowFragment({
  row,
  cols,
  guesses,
  onSelect,
}: {
  row: string;
  cols: string[];
  guesses: Record<string, GridGuess>;
  onSelect: (key: string) => void;
}) {
  return (
    <>
      <GridHeader label={row} helper="row" />
      {cols.map((col) => {
        const key = `${row},${col}`;
        const guess = guesses[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={`flex aspect-[4/3] min-h-24 items-center justify-center rounded-xl border-4 border-ink px-3 text-center font-display text-sm uppercase tracking-widest transition-transform hover:-translate-y-0.5 ${
              guess?.revealed ? 'bg-gold text-ink' : 'bg-cream-50 text-ink/20'
            }`}
          >
            {guess?.value || '?'}
          </button>
        );
      })}
    </>
  );
}

function GridHeader({ label, helper }: { label: string; helper: string }) {
  return (
    <div className="flex min-h-20 flex-col items-center justify-center rounded-xl border-4 border-ink bg-cream-50 px-2 text-center">
      <span className="font-display text-xl uppercase text-ink">{label}</span>
      <span className="mt-1 max-w-full truncate font-mono text-[9px] uppercase tracking-widest text-ink-soft">
        {helper}
      </span>
    </div>
  );
}

function ScorePanel({
  completed,
  score,
  error,
  onSubmit,
}: {
  completed: number;
  score: number | null;
  error: string | null;
  onSubmit: () => void;
}) {
  return (
    <div className="rounded-2xl border-4 border-ink bg-cream-50 p-5 shadow-card-lift">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink">Progress</p>
        <span className="rounded-full bg-flame px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-cream-50">
          {completed}/9
        </span>
      </div>
      {score === null ? (
        <button
          type="button"
          onClick={onSubmit}
          className="mt-5 w-full rounded-full bg-ink py-4 font-display text-sm uppercase tracking-widest text-cream-50 transition-transform hover:-translate-y-0.5"
        >
          Submit score
        </button>
      ) : (
        <div className="mt-5 rounded-xl border-2 border-gold bg-gold/20 p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gold-dark">Score</p>
          <p className="font-display text-5xl text-ink">{score}</p>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-flame">{error}</p>}
    </div>
  );
}

function ComingSoonGame({ type, hasPuzzle }: { type: RoutePuzzleType; hasPuzzle: boolean }) {
  return (
    <section className="max-w-2xl">
      <Link to="/" className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink-soft">
        Back to today
      </Link>
      <h1 className="mt-2 font-display text-6xl capitalize leading-[0.95] text-ink lg:text-7xl">
        {type}
      </h1>
      <div className="mt-8 rounded-2xl border-4 border-ink bg-cream-50 p-8 shadow-card-lift">
        <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-gold-dark">
          {hasPuzzle ? 'Puzzle loaded' : 'Waiting for puzzle'}
        </p>
        <p className="mt-3 text-sm leading-6 text-ink-soft">
          Football Grid is the active José task. This route is ready for the next game component.
        </p>
      </div>
    </section>
  );
}

function PageNotice({ title, detail, tone = 'muted' }: { title: string; detail: string; tone?: 'muted' | 'error' }) {
  return (
    <div className={`rounded-2xl border-4 border-ink bg-cream-50 p-8 shadow-card-lift ${tone === 'error' ? 'text-flame' : 'text-ink'}`}>
      <p className="font-display text-4xl">{title}</p>
      <p className="mt-2 text-sm text-ink-soft">{detail}</p>
    </div>
  );
}

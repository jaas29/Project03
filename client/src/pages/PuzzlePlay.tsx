import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { api, extractApiError } from '../api/client';
import { Wordmark } from '../components/Wordmark';
import { canonicalPlayerName, playerNameSuggestions } from '../lib/playerNames';
import { loadGame, saveGame } from '../lib/gameStorage';
import { useAuth } from '../store/auth';
import { markPuzzleComplete } from '../hooks/useTodayProgress';
import type { PuzzleType } from '../types/puzzle';

type RoutePuzzleType = Extract<PuzzleType, 'grid' | 'connections' | 'wordle'>;

export interface ApiPuzzle {
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
  playerPool?: string[];
  playerHeadshots?: Record<string, string>;
}

interface GridGuess {
  value: string;
  revealed: boolean;
  correct?: boolean;
}

interface ConnectionsPayload {
  items: string[];
}

interface WordlePayload {
  length: number;
  maxAttempts: number;
  hint: string;
}

type LetterStatus = 'correct' | 'present' | 'absent';

interface SubmitResult {
  score: number;
  solved: boolean;
  streak?: number;
  validation:
    | {
        kind: 'grid';
        correctCells: string[];
        totalCells: number;
        solution: Record<string, string>;
      }
    | {
        kind: 'connections';
        correctGroups: string[][];
        totalGroups: number;
        solution: { category: string; items: string[] }[];
      }
    | {
        kind: 'wordle';
        rows: { guess: string; statuses: LetterStatus[] }[];
        answer: string;
      };
}

interface GridCheckResult {
  kind: 'grid';
  correct: boolean;
  cellKey: string;
}

interface WordleCheckResult {
  kind: 'wordle';
  guess: string;
  statuses: LetterStatus[];
  solved: boolean;
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

const DEMO_CONNECTIONS: ApiPuzzle = {
  _id: 'demo-connections',
  date: new Date().toISOString().slice(0, 10),
  type: 'connections',
  payload: {
    items: [
      'Salah',
      'Rodri',
      'Mbappe',
      'Haaland',
      'Bellingham',
      'Pedri',
      'Musiala',
      'Lewandowski',
      'Real',
      'United',
      'City',
      'Inter',
      'Madrid',
      'Manchester',
      'Milan',
      'Bayern',
    ],
  } satisfies ConnectionsPayload,
};

const DEMO_WORDLE: ApiPuzzle = {
  _id: 'demo-wordle',
  date: new Date().toISOString().slice(0, 10),
  type: 'wordle',
  payload: {
    length: 5,
    maxAttempts: 6,
    hint: 'Footballer surname',
  } satisfies WordlePayload,
};

const NATIONALITY_TO_FLAG: Record<string, string> = {
  argentina: 'ar',
  australia: 'au',
  austria: 'at',
  belgium: 'be',
  brazil: 'br',
  cameroon: 'cm',
  croatia: 'hr',
  denmark: 'dk',
  egypt: 'eg',
  england: 'gb-eng',
  france: 'fr',
  germany: 'de',
  ghana: 'gh',
  greece: 'gr',
  italy: 'it',
  japan: 'jp',
  mexico: 'mx',
  morocco: 'ma',
  netherlands: 'nl',
  nigeria: 'ng',
  norway: 'no',
  poland: 'pl',
  portugal: 'pt',
  scotland: 'gb-sct',
  senegal: 'sn',
  serbia: 'rs',
  'south korea': 'kr',
  spain: 'es',
  sweden: 'se',
  switzerland: 'ch',
  turkey: 'tr',
  ukraine: 'ua',
  'united states': 'us',
  uruguay: 'uy',
  wales: 'gb-wls',
};

function nationalityFlagCode(nationality: string): string | null {
  return NATIONALITY_TO_FLAG[nationality.trim().toLowerCase()] ?? null;
}

function normalizePersonName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function normalizeTeamName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function teamCrestCacheKey(col: string, teamName: string): string {
  const normalizedName = normalizeTeamName(teamName);
  return normalizedName || col.toLowerCase();
}

function tokenizeNormalized(value: string): string[] {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return normalized.match(/[a-z0-9]+/g) ?? [];
}

type SportsDbPlayer = {
  strPlayer?: string;
  strCutout?: string;
  strThumb?: string;
  strRender?: string;
  strTeam?: string;
  strNationality?: string;
};

const TEAM_CREST_CACHE_KEY = 'jbd.grid.teamCrestCache.v2';
const PLAYER_HEADSHOT_CACHE_KEY = 'jbd.grid.playerHeadshotCache.v1';

function readAssetCache(key: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        ([cacheKey, value]) => typeof cacheKey === 'string' && typeof value === 'string' && value.trim().length > 0,
      ),
    );
  } catch {
    return {};
  }
}

function writeAssetCache(key: string, value: Record<string, string>): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota and storage errors.
  }
}

function preferredHeadshot(player: SportsDbPlayer): string {
  return (player.strCutout ?? player.strThumb ?? player.strRender ?? '').trim();
}

function chooseBestHeadshotCandidate(
  players: SportsDbPlayer[],
  guessedName: string,
  teamName: string,
  nationality: string,
): SportsDbPlayer | null {
  const targetName = normalizePersonName(guessedName);
  const targetTeam = normalizePersonName(teamName);
  const targetNationality = normalizePersonName(nationality);
  const targetNameTokens = tokenizeNormalized(guessedName);

  const candidateMatches = players.filter((player) => {
    const candidateName = normalizePersonName(player.strPlayer ?? '');
    if (!candidateName) return false;
    if (candidateName === targetName) return true;
    if (candidateName.includes(targetName) || targetName.includes(candidateName)) return true;

    const candidateTokens = tokenizeNormalized(player.strPlayer ?? '');
    const overlap = targetNameTokens.filter((token) => candidateTokens.includes(token)).length;
    return overlap >= Math.min(2, targetNameTokens.length);
  });

  if (candidateMatches.length === 0) return null;

  const ranked = candidateMatches
    .map((player) => {
      const image = preferredHeadshot(player);
      const candidateName = normalizePersonName(player.strPlayer ?? '');
      const exactNameScore = candidateName === targetName ? 3 : 0;
      const containsNameScore = !exactNameScore && (candidateName.includes(targetName) || targetName.includes(candidateName)) ? 1 : 0;
      const teamScore = normalizePersonName(player.strTeam ?? '') === targetTeam ? 2 : 0;
      const nationalityScore = normalizePersonName(player.strNationality ?? '') === targetNationality ? 1 : 0;
      return {
        player,
        image,
        score: exactNameScore + containsNameScore + teamScore + nationalityScore,
      };
    })
    .filter((entry) => Boolean(entry.image))
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.player ?? null;
}

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
  const playablePuzzle =
    puzzle ??
    (puzzleType === 'grid'
      ? DEMO_GRID
      : puzzleType === 'connections'
        ? DEMO_CONNECTIONS
        : DEMO_WORDLE);

  return (
    <div className="min-h-screen bg-cream-200 text-ink">
      <header className="border-b-2 border-ink bg-cream-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Wordmark variant="dark" size="sm" />
          <div className="flex items-center gap-3">
            <Link to="/" className="rounded-full border-2 border-ink px-4 py-2 font-display text-[11px] uppercase tracking-widest text-ink">
              <span className="inline-flex items-center gap-1">
                <span className="text-[18px] leading-none">⬅</span>
                <span>back to today</span>
              </span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {loading && <PageNotice title="Loading fixture." detail="Getting today's set from the API." />}
        {error && <PageNotice title="API is late." detail={error} tone="error" />}

        {!loading && puzzleType === 'grid' && playablePuzzle && (
          <GridGame puzzle={playablePuzzle} usingDemo={!puzzle} />
        )}

        {!loading && puzzleType === 'connections' && playablePuzzle && (
          <ConnectionsGame puzzle={playablePuzzle} usingDemo={!puzzle} />
        )}

        {!loading && puzzleType === 'wordle' && playablePuzzle && (
          <WordleGame puzzle={playablePuzzle} usingDemo={!puzzle} />
        )}
      </main>
    </div>
  );
}

export type DuelCompleteData = { attempts: number; durationMs: number; solved: boolean };

function DuelSubmitPanel({ onSubmit }: { onSubmit: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  return (
    <div className="rounded-2xl border-4 border-ink bg-cream-50 p-5 shadow-card-lift">
      <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink">Duel</p>
      {submitted ? (
        <p className="mt-5 font-mono text-[11px] uppercase tracking-widest text-ink-soft">Score submitted…</p>
      ) : (
        <button
          type="button"
          onClick={() => { setSubmitted(true); onSubmit(); }}
          className="mt-5 w-full rounded-full bg-ink py-4 font-display text-sm uppercase tracking-widest text-cream-50 transition-transform hover:-translate-y-0.5"
        >
          Submit to Duel →
        </button>
      )}
    </div>
  );
}

export function GridGame({ puzzle, usingDemo, onDuelComplete }: { puzzle: ApiPuzzle; usingDemo: boolean; onDuelComplete?: (d: DuelCompleteData) => void }) {
  const payload = puzzle.payload as GridPayload;
  const { refreshUser } = useAuth();
  const rows = payload.rows.slice(0, 3);
  const cols = payload.cols.slice(0, 3);

  type GridSaved = { guesses: Record<string, GridGuess>; score: number | null; result: SubmitResult | null };
  const saved = !usingDemo ? loadGame<GridSaved>(puzzle._id) : null;

  const [guesses, setGuesses] = useState<Record<string, GridGuess>>(saved?.guesses ?? {});
  const [entry, setEntry] = useState('');
  const [pendingName, setPendingName] = useState('');
  const [matchOptions, setMatchOptions] = useState<string[]>([]);
  const [startedAt] = useState(() => Date.now());
  const [score, setScore] = useState<number | null>(saved?.score ?? null);
  const [result, setResult] = useState<SubmitResult | null>(saved?.result ?? null);
  const [guessError, setGuessError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [dynamicHeadshots, setDynamicHeadshots] = useState<Record<string, string>>(() => readAssetCache(PLAYER_HEADSHOT_CACHE_KEY));
  const [dynamicTeamCrests, setDynamicTeamCrests] = useState<Record<string, string>>(() => readAssetCache(TEAM_CREST_CACHE_KEY));

  useEffect(() => {
    if (!usingDemo) saveGame(puzzle._id, { guesses, score, result });
  }, [puzzle._id, usingDemo, guesses, score, result]);

  const completed = Object.keys(guesses).filter((key) => guesses[key]?.value.trim()).length;
  const attempts = Math.max(1, completed);
  const guessedCells = Object.entries(guesses)
    .filter(([, guess]) => guess?.value.trim())
    .map(([cellKey]) => cellKey);
  const rowCompletions = rows.filter((row) => cols.every((col) => guessedCells.includes(`${row},${col}`))).length;
  const colCompletions = cols.filter((col) => rows.every((row) => guessedCells.includes(`${row},${col}`))).length;
  const liveScore = guessedCells.length * 10 + (rowCompletions + colCompletions) * 10;
  const playerPool = payload.playerPool ?? [];
  const payloadHeadshots = payload.playerHeadshots ?? {};
  const playerHeadshots = { ...payloadHeadshots, ...dynamicHeadshots };
  const suggestions = playerNameSuggestions(entry, playerPool);

  useEffect(() => {
    writeAssetCache(TEAM_CREST_CACHE_KEY, dynamicTeamCrests);
  }, [dynamicTeamCrests]);

  useEffect(() => {
    writeAssetCache(PLAYER_HEADSHOT_CACHE_KEY, dynamicHeadshots);
  }, [dynamicHeadshots]);

  useEffect(() => {
    let cancelled = false;
    const missingCols = cols.filter((col) => {
      const teamName = payload.teamMeta[col]?.name;
      if (!teamName || payload.teamMeta[col]?.crest) return false;
      return !dynamicTeamCrests[teamCrestCacheKey(col, teamName)];
    });
    if (missingCols.length === 0) return;

    async function loadTeamCrests() {
      const fetched: Record<string, string> = {};
      await Promise.all(
        missingCols.map(async (col) => {
          const teamName = payload.teamMeta[col]?.name;
          if (!teamName) return;
          const cacheKey = teamCrestCacheKey(col, teamName);
          try {
            const response = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(teamName)}`);
            if (!response.ok) return;
            const data = await response.json() as {
              teams?: Array<{ strTeam?: string; strTeamShort?: string; strBadge?: string }> | null;
            };
            const target = normalizeTeamName(teamName);
            const targetTokens = tokenizeNormalized(teamName);
            const RESERVE_REGEX = /\b(ii|iii|iv|reserves?|youth|ladies|women|feminin|feminine|u\d\d?)\b/i;

            const rankedTeams = (data.teams ?? [])
              .map((team) => {
                const fullName = team.strTeam ?? '';
                const shortName = team.strTeamShort ?? '';
                const full = normalizeTeamName(fullName);
                const short = normalizeTeamName(shortName);
                const fullTokens = tokenizeNormalized(fullName);
                const shortTokens = tokenizeNormalized(shortName);

                const exactScore = full === target || (short && short === target) ? 4 : 0;
                const containsScore =
                  !exactScore && (full.includes(target) || target.includes(full) || (short && (short.includes(target) || target.includes(short))))
                    ? 2
                    : 0;
                const overlapFull = targetTokens.filter((token) => fullTokens.includes(token)).length;
                const overlapShort = targetTokens.filter((token) => shortTokens.includes(token)).length;
                const overlapScore = Math.max(overlapFull, overlapShort);
                const reservePenalty = RESERVE_REGEX.test(fullName) || RESERVE_REGEX.test(shortName) ? -5 : 0;

                return {
                  team,
                  score: exactScore + containsScore + overlapScore + reservePenalty,
                  nameLength: fullName.length,
                };
              })
              .filter((entry) => Boolean((entry.team.strBadge ?? '').trim()))
              .sort((a, b) => b.score - a.score || a.nameLength - b.nameLength);

            const best = rankedTeams[0];
            const crest = (best?.team.strBadge ?? '').trim();
            if (best && best.score >= 2 && crest) fetched[cacheKey] = crest;
          } catch {
            // Best effort fallback only.
          }
        }),
      );

      if (!cancelled && Object.keys(fetched).length > 0) {
        setDynamicTeamCrests((current) => ({ ...current, ...fetched }));
      }
    }

    void loadTeamCrests();
    return () => {
      cancelled = true;
    };
  }, [cols, payload.teamMeta, dynamicTeamCrests]);

  useEffect(() => {
    let cancelled = false;
    const unresolvedByName = new Map<string, { name: string; teamName: string; nationality: string }>();
    Object.entries(guesses).forEach(([cellKey, guess]) => {
      const guessedName = guess.value?.trim();
      if (!guessedName || payloadHeadshots[guessedName] || dynamicHeadshots[guessedName]) return;
      const [nationality, col] = cellKey.split(',');
      if (!nationality || !col) return;
      const teamName = payload.teamMeta[col]?.name ?? col;
      unresolvedByName.set(guessedName, { name: guessedName, teamName, nationality });
    });

    const unresolvedEntries = [...unresolvedByName.values()];
    if (unresolvedEntries.length === 0) return;

    async function loadHeadshots() {
      const fetched: Record<string, string> = {};
      await Promise.all(
        unresolvedEntries.map(async ({ name, teamName, nationality }) => {
          try {
            const response = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(name)}`);
            if (!response.ok) return;
            const data = await response.json() as { player?: SportsDbPlayer[] | null };
            const bestMatch = chooseBestHeadshotCandidate(data.player ?? [], name, teamName, nationality);
            const image = bestMatch ? preferredHeadshot(bestMatch) : '';
            if (image) fetched[name] = image;
          } catch {
            // Best effort fallback only.
          }
        }),
      );

      if (!cancelled && Object.keys(fetched).length > 0) {
        setDynamicHeadshots((current) => ({ ...current, ...fetched }));
      }
    }

    void loadHeadshots();
    return () => {
      cancelled = true;
    };
  }, [guesses, payloadHeadshots, dynamicHeadshots, payload.teamMeta]);

  function setGuess(cellKey: string, name: string, correct: boolean | undefined) {
    setGuesses((current) => ({
      ...current,
      [cellKey]: { value: name, revealed: true, correct },
    }));
    setEntry('');
    setGuessError(null);
  }

  async function autoPlaceGuess(nameOverride?: string) {
    const sourceName = nameOverride ?? entry;
    if (!sourceName.trim()) return;
    setGuessError(null);
    const canonical = canonicalPlayerName(sourceName, playerPool);

    const emptyKeys = rows
      .flatMap((row) => cols.map((col) => `${row},${col}`))
      .filter((key) => !guesses[key]?.value?.trim());

    if (emptyKeys.length === 0) {
      setGuessError('Grid is already full. Submit your score.');
      return;
    }

    const matchingKeys: string[] = [];

    if (usingDemo) {
      matchingKeys.push(...emptyKeys);
    } else {
      for (const cellKey of emptyKeys) {
        try {
          const { data } = await api.post<GridCheckResult>(`/api/puzzles/${puzzle._id}/check`, {
            cellKey,
            guess: canonical,
          });
          if (data.correct) matchingKeys.push(cellKey);
        } catch {
          // Ignore per-cell check failures and keep validating other cells.
        }
      }
    }

    if (matchingKeys.length === 0) {
      if (nameOverride) {
        setEntry('');
      }
      setGuessError(`${canonical} does not match any open square`);
      return;
    }

    if (matchingKeys.length === 1) {
      setGuess(matchingKeys[0], canonical, true);
      return;
    }

    setPendingName(canonical);
    setMatchOptions(matchingKeys);
  }

  function chooseMatch(cellKey: string) {
    if (!pendingName) return;
    setGuess(cellKey, pendingName, true);
    setPendingName('');
    setMatchOptions([]);
  }

  function cancelMatchChoice() {
    setPendingName('');
    setMatchOptions([]);
  }

  async function submitScore() {
    setSubmitError(null);
    const durationMs = Date.now() - startedAt;
    if (usingDemo) {
      const demoResult: SubmitResult = {
        score: liveScore,
        solved: completed === 9,
        validation: {
          kind: 'grid',
          correctCells: Object.keys(guesses),
          totalCells: 9,
          solution: Object.fromEntries(Object.keys(guesses).map((key) => [key, guesses[key].value])),
        },
      };
      setScore(demoResult.score);
      setResult(demoResult);
      return;
    }

    try {
      const { data } = await api.post<SubmitResult>(`/api/puzzles/${puzzle._id}/submit`, {
        attempts,
        durationMs,
        guesses: Object.fromEntries(Object.entries(guesses).map(([key, guess]) => [key, guess.value])),
      });
      setScore(data.score);
      setResult(data);
      markPuzzleComplete('grid');
      refreshUser();
    } catch (err) {
      setSubmitError(extractApiError(err));
    }
  }

  return (
    <div>
      <section>
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

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,700px)_280px] lg:items-start">
          <div className="max-w-[700px] rounded-2xl border-4 border-ink bg-cream-50 p-5 shadow-card-lift">
            <div className="grid grid-cols-[repeat(4,minmax(0,1fr))] gap-2 sm:gap-3">
              <div className="grid aspect-square place-items-center rounded-xl border-4 border-ink bg-cream-50 px-2">
                <Wordmark variant="dark" size="md" />
              </div>
              {cols.map((col) => (
                <GridHeader
                  key={col}
                  label={col}
                  helper={payload.teamMeta[col]?.name ?? col}
                  logoUrl={payload.teamMeta[col]?.crest || dynamicTeamCrests[teamCrestCacheKey(col, payload.teamMeta[col]?.name ?? col)]}
                />
              ))}

              {rows.map((row) => (
                <RowFragment
                  key={row}
                  row={row}
                  cols={cols}
                  guesses={guesses}
                  playerHeadshots={playerHeadshots}
                  correctCells={result?.validation.kind === 'grid' ? result.validation.correctCells : []}
                  highlightCells={matchOptions}
                  onCellClick={chooseMatch}
                />
              ))}
            </div>
          </div>

          <aside className="space-y-4 lg:w-[280px]">
            {onDuelComplete ? (
              <DuelSubmitPanel onSubmit={() => onDuelComplete({ attempts: Math.max(1, completed), durationMs: Date.now() - startedAt, solved: completed >= 9 })} />
            ) : (
              <ScorePanel
                completed={completed}
                total={9}
                score={score}
                liveScore={liveScore}
                error={submitError}
                onSubmit={submitScore}
              />
            )}
            <div className="rounded-2xl border-4 border-ink bg-cream-100 p-5 shadow-card-lift">
              <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink">Hints</p>
              <p className="mt-3 text-sm leading-6 text-ink-soft">
                Stuck? Use the row and club abbreviation together. A good guess can be active, retired,
                or recently transferred.
              </p>
            </div>
          </aside>
        </div>

        <div className="mt-6 max-w-[700px] rounded-2xl border-4 border-ink bg-cream-50 p-5 shadow-card-lift">
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-gold-dark">
            Enter player name
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              autoPlaceGuess();
            }}
            className="mt-3"
          >
            <input
              value={entry}
              onChange={(event) => setEntry(event.target.value)}
              placeholder="e.g. Cristiano Ronaldo"
              className="min-w-0 flex-1 rounded-2xl border-4 border-ink bg-cream-50 px-4 py-3 font-display text-lg text-ink placeholder:font-sans placeholder:text-sm placeholder:text-ink/35 focus:outline-none focus:ring-4 focus:ring-gold/40"
            />
          </form>

          {entry.trim() && suggestions.length > 0 && (
            <div className="mt-3 grid gap-2">
              {suggestions.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    void autoPlaceGuess(name);
                  }}
                  className="rounded-xl border-2 border-ink bg-cream-100 px-3 py-2 text-left font-display text-sm uppercase tracking-widest text-ink transition-transform hover:-translate-y-0.5"
                >
                  {name}
                </button>
              ))}
            </div>
          )}

          {matchOptions.length > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border-2 border-gold bg-gold/10 px-4 py-3">
              <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-gold-dark">
                Click a highlighted square to place {pendingName}
              </p>
              <button
                type="button"
                onClick={cancelMatchChoice}
                className="shrink-0 rounded-full border-2 border-ink px-3 py-1 font-display text-xs uppercase tracking-widest text-ink"
              >
                Cancel
              </button>
            </div>
          )}

          {guessError && <p className="mt-3 text-sm text-flame">{guessError}</p>}
        </div>
      </section>

      {result && <ResultModal result={result} onClose={() => setResult(null)} />}
    </div>
  );
}

function RowFragment({
  row,
  cols,
  guesses,
  playerHeadshots,
  correctCells,
  highlightCells = [],
  onCellClick,
}: {
  row: string;
  cols: string[];
  guesses: Record<string, GridGuess>;
  playerHeadshots: Record<string, string>;
  correctCells: string[];
  highlightCells?: string[];
  onCellClick?: (key: string) => void;
}) {
  return (
    <>
      <GridHeader label={row} flagCode={nationalityFlagCode(row) ?? undefined} />
      {cols.map((col) => {
        const key = `${row},${col}`;
        const guess = guesses[key];
        const playerImage = guess?.value ? playerHeadshots[guess.value] : undefined;
        const isCorrect = guess?.correct === true || correctCells.includes(key);
        const isWrong = guess?.correct === false;
        const isHighlight = highlightCells.includes(key);

        if (isHighlight) {
          return (
            <button
              key={key}
              type="button"
              onClick={() => onCellClick?.(key)}
              className="flex aspect-square min-h-22 cursor-pointer animate-pulse items-center justify-center rounded-xl border-4 border-gold bg-gold/30 px-3 text-center font-display text-[13px] uppercase tracking-widest text-gold-dark ring-2 ring-gold ring-offset-1 transition-colors hover:bg-gold/60 sm:min-h-24 sm:text-sm"
            >
              ?
            </button>
          );
        }

        return (
          <div
            key={key}
            className={`flex aspect-square min-h-22 items-center justify-center rounded-xl border-4 border-ink text-center font-display text-[13px] uppercase tracking-widest sm:min-h-24 sm:text-sm ${
              isWrong
                ? 'bg-flame text-cream-50'
                : isCorrect
                  ? 'bg-pitch-jersey text-cream-50'
                  : guess?.revealed ? 'bg-gold text-ink' : 'bg-cream-50 text-ink/20'
            } ${playerImage ? 'p-1' : 'px-3'}`}
          >
            {guess?.value
              ? playerImage
                ? <img src={playerImage} alt={guess.value} className="h-full w-full rounded-md object-cover" loading="lazy" />
                : guess.value
              : '?'}
          </div>
        );
      })}
    </>
  );
}

function GridHeader({
  label,
  helper,
  flagCode,
  logoUrl,
}: {
  label: string;
  helper?: string;
  flagCode?: string;
  logoUrl?: string;
}) {
  return (
    <div className="relative flex aspect-square w-full flex-col items-center justify-center rounded-xl border-4 border-ink bg-cream-50 px-1 text-center sm:px-2">
      {logoUrl ? (
        <img src={logoUrl} alt={`${helper ?? label} crest`} className="h-[4.5rem] w-[4.5rem] object-contain sm:h-20 sm:w-20" loading="lazy" />
      ) : flagCode ? (
        <span
          className={`fi fi-${flagCode} mb-1 rounded-sm`}
          style={{ fontSize: '3.9rem', lineHeight: 1 }}
          aria-label={`${label} flag`}
        />
      ) : null}
      {logoUrl || flagCode ? (
        <span className="absolute bottom-1 left-1 right-1 max-w-full truncate font-mono text-[9px] uppercase tracking-widest text-ink-soft sm:text-[10px]">
          {helper ?? label}
        </span>
      ) : (
        <span className="font-display text-base uppercase text-ink sm:text-lg">{label}</span>
      )}
    </div>
  );
}

function ScorePanel({
  completed,
  total,
  score,
  liveScore,
  error,
  onSubmit,
}: {
  completed: number;
  total: number;
  score: number | null;
  liveScore?: number | null;
  error: string | null;
  onSubmit: () => void;
}) {
  const hasLiveScore = typeof liveScore === 'number';
  const displayScore = hasLiveScore ? liveScore : score;

  return (
    <div className="rounded-2xl border-4 border-ink bg-cream-50 p-5 shadow-card-lift">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink">Progress</p>
        <span className="rounded-full bg-flame px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-cream-50">
          {completed}/{total}
        </span>
      </div>
      <button
        type="button"
        onClick={onSubmit}
        className="mt-5 w-full rounded-full bg-ink py-4 font-display text-sm uppercase tracking-widest text-cream-50 transition-transform hover:-translate-y-0.5"
      >
        Submit score
      </button>
      {displayScore !== null && (
        <div className="mt-5 rounded-xl border-2 border-gold bg-gold/20 p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gold-dark">{hasLiveScore ? 'Live score' : 'Score'}</p>
          <p className="font-display text-5xl text-ink">{displayScore}</p>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-flame">{error}</p>}
    </div>
  );
}

export function ConnectionsGame({ puzzle, usingDemo, onDuelComplete }: { puzzle: ApiPuzzle; usingDemo: boolean; onDuelComplete?: (d: DuelCompleteData) => void }) {
  const payload = puzzle.payload as ConnectionsPayload;
  const { refreshUser } = useAuth();

  type ConnSaved = { solvedGroups: string[][]; mistakes: number; score: number | null; result: SubmitResult | null };
  const saved = !usingDemo ? loadGame<ConnSaved>(puzzle._id) : null;

  const [selected, setSelected] = useState<string[]>([]);
  const [solvedGroups, setSolvedGroups] = useState<string[][]>(saved?.solvedGroups ?? []);
  const [mistakes, setMistakes] = useState(saved?.mistakes ?? 0);
  const [startedAt] = useState(() => Date.now());
  const [score, setScore] = useState<number | null>(saved?.score ?? null);
  const [result, setResult] = useState<SubmitResult | null>(saved?.result ?? null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!usingDemo) saveGame(puzzle._id, { solvedGroups, mistakes, score, result });
  }, [puzzle._id, usingDemo, solvedGroups, mistakes, score, result]);

  const remainingItems = payload.items.filter((item) => !solvedGroups.flat().includes(item)).slice(0, 16);
  const solved = solvedGroups.length >= 4;

  function toggleItem(item: string) {
    if (score !== null) return;
    setSelected((current) => {
      if (current.includes(item)) return current.filter((candidate) => candidate !== item);
      if (current.length >= 4) return current;
      return [...current, item];
    });
  }

  function submitGroup() {
    if (selected.length !== 4) return;
    setSolvedGroups((current) => [...current, selected]);
    setSelected([]);
  }

  async function submitScore() {
    setSubmitError(null);
    const durationMs = Date.now() - startedAt;
    const attempts = Math.max(1, solvedGroups.length + mistakes);
    if (usingDemo) {
      const demoResult: SubmitResult = {
        score: Math.max(0, 1000 - mistakes * 120 - (4 - solvedGroups.length) * 150),
        solved,
        validation: {
          kind: 'connections',
          correctGroups: solvedGroups,
          totalGroups: 4,
          solution: solvedGroups.map((items, index) => ({ category: `Group ${index + 1}`, items })),
        },
      };
      setScore(demoResult.score);
      setResult(demoResult);
      return;
    }
    try {
      const { data } = await api.post<SubmitResult>(`/api/puzzles/${puzzle._id}/submit`, {
        attempts,
        durationMs,
        groups: solvedGroups,
      });
      setScore(data.score);
      setResult(data);
      markPuzzleComplete('connections');
      refreshUser();
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
          Connections
        </h1>
        <p className="mt-2 max-w-md text-sm text-ink-soft">
          Find four groups of four.
        </p>
        {usingDemo && (
          <div className="mt-5 inline-flex rounded-full border-2 border-gold bg-gold/20 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-gold-dark">
            Demo board while API data loads
          </div>
        )}

        <div className="mt-8 rounded-2xl border-4 border-ink bg-cream-50 p-5 shadow-card-lift">
          {solvedGroups.length > 0 && (
            <div className="mb-4 grid gap-2">
              {solvedGroups.map((group, index) => (
                <div key={group.join('-')} className="rounded-xl border-4 border-ink bg-gold px-4 py-3">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-soft">
                    Group {index + 1}
                  </p>
                  <p className="font-display text-lg uppercase text-ink">{group.join(' / ')}</p>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {remainingItems.map((item) => {
              const active = selected.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleItem(item)}
                  className={`min-h-20 rounded-xl border-4 border-ink px-2 text-center font-display text-sm uppercase tracking-widest transition-transform hover:-translate-y-0.5 ${
                    active ? 'bg-ink text-cream-50' : 'bg-cream-50 text-ink'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={submitGroup}
              disabled={selected.length !== 4}
              className="rounded-full bg-ink px-5 py-3 font-display text-sm uppercase tracking-widest text-cream-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Submit group
            </button>
            <button
              type="button"
              onClick={() => setSelected([])}
              className="rounded-full border-2 border-ink px-5 py-3 font-display text-sm uppercase tracking-widest text-ink"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setMistakes((count) => Math.min(4, count + 1))}
              className="rounded-full border-2 border-flame px-5 py-3 font-display text-sm uppercase tracking-widest text-flame"
            >
              Mark miss
            </button>
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        {onDuelComplete ? (
          <DuelSubmitPanel onSubmit={() => onDuelComplete({ attempts: Math.max(1, solvedGroups.length + mistakes), durationMs: Date.now() - startedAt, solved })} />
        ) : (
          <ScorePanel completed={solvedGroups.length} total={4} score={score} error={submitError} onSubmit={submitScore} />
        )}
        <div className="rounded-2xl border-4 border-ink bg-cream-100 p-5 shadow-card-lift">
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink">Mistakes</p>
          <div className="mt-3 flex gap-2">
            {[0, 1, 2, 3].map((dot) => (
              <span key={dot} className={`h-5 w-5 rounded-full border-2 border-ink ${dot < mistakes ? 'bg-flame' : 'bg-cream-50'}`} />
            ))}
          </div>
        </div>
      </aside>
      {result && <ResultModal result={result} onClose={() => setResult(null)} />}
    </div>
  );
}

export function WordleGame({ puzzle, usingDemo, onDuelComplete }: { puzzle: ApiPuzzle; usingDemo: boolean; onDuelComplete?: (d: DuelCompleteData) => void }) {
  const payload = puzzle.payload as WordlePayload;
  const { refreshUser } = useAuth();

  type WordleSaved = { guesses: string[]; checkedRows: { guess: string; statuses: LetterStatus[] }[]; score: number | null; result: SubmitResult | null };
  const saved = !usingDemo ? loadGame<WordleSaved>(puzzle._id) : null;

  const [guesses, setGuesses] = useState<string[]>(saved?.guesses ?? []);
  const [checkedRows, setCheckedRows] = useState<{ guess: string; statuses: LetterStatus[] }[]>(saved?.checkedRows ?? []);
  const [entry, setEntry] = useState('');
  const [startedAt] = useState(() => Date.now());
  const [score, setScore] = useState<number | null>(saved?.score ?? null);
  const [result, setResult] = useState<SubmitResult | null>(saved?.result ?? null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!usingDemo) saveGame(puzzle._id, { guesses, checkedRows, score, result });
  }, [puzzle._id, usingDemo, guesses, checkedRows, score, result]);

  const length = payload.length;
  const maxAttempts = payload.maxAttempts;
  const solved = checkedRows.some((row) => row.statuses.every((status) => status === 'correct'));

  async function addGuess() {
    const cleaned = entry.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, length);
    if (cleaned.length !== length || guesses.length >= maxAttempts) return;
    let statuses = Array.from({ length: cleaned.length }, (_, index) => tileStatus(index));

    if (!usingDemo) {
      try {
        const { data } = await api.post<WordleCheckResult>(`/api/puzzles/${puzzle._id}/check`, {
          guess: cleaned,
        });
        statuses = data.statuses;
      } catch {
        statuses = Array.from({ length: cleaned.length }, () => 'absent' as LetterStatus);
      }
    }

    setGuesses((current) => [...current, cleaned]);
    setCheckedRows((current) => [...current, { guess: cleaned, statuses }]);
    setEntry('');
  }

  async function submitScore() {
    setSubmitError(null);
    const durationMs = Date.now() - startedAt;
    if (usingDemo) {
      const demoResult: SubmitResult = {
        score: Math.max(0, 900 - Math.max(0, guesses.length - 1) * 90),
        solved: guesses.length > 0,
        validation: {
          kind: 'wordle',
          rows: guesses.map((guess) => ({
            guess,
            statuses: Array.from({ length: guess.length }, (_, index) => tileStatus(index)),
          })),
          answer: guesses.at(-1) ?? '',
        },
      };
      setScore(demoResult.score);
      setResult(demoResult);
      return;
    }
    try {
      const { data } = await api.post<SubmitResult>(`/api/puzzles/${puzzle._id}/submit`, {
        attempts: Math.max(1, guesses.length),
        durationMs,
        guesses,
      });
      setScore(data.score);
      setResult(data);
      markPuzzleComplete('wordle');
      refreshUser();
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
          Soccer Wordle
        </h1>
        <p className="mt-2 max-w-md text-sm text-ink-soft">
          {payload.hint}
        </p>
        {usingDemo && (
          <div className="mt-5 inline-flex rounded-full border-2 border-gold bg-gold/20 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-gold-dark">
            Demo word while API data loads
          </div>
        )}

        <div className="mt-8 rounded-2xl border-4 border-ink bg-cream-50 p-5 shadow-card-lift">
          <div className="grid gap-2">
            {Array.from({ length: maxAttempts }).map((_, row) => {
              const guess = guesses[row] ?? '';
              const validationRow =
                checkedRows[row] ??
                (result?.validation.kind === 'wordle' ? result.validation.rows[row] : null);
              return (
                <div key={row} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}>
                  {Array.from({ length }).map((__, col) => (
                    <div
                      key={`${row}-${col}`}
                      className={`grid aspect-square place-items-center rounded-lg border-4 border-ink font-display text-xl uppercase ${
                        guess ? tileTone(validationRow?.statuses[col] ?? tileStatus(col)) : 'bg-cream-50 text-ink/20'
                      }`}
                    >
                      {guess[col] ?? ''}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              addGuess();
            }}
            className="mt-5 flex gap-3"
          >
            <input
              value={entry}
              onChange={(event) => setEntry(event.target.value)}
              maxLength={length}
              placeholder={`${length} letters`}
              className="min-w-0 flex-1 rounded-2xl border-4 border-ink bg-cream-50 px-4 py-3 font-display text-lg uppercase text-ink placeholder:font-sans placeholder:text-sm placeholder:text-ink/35 focus:outline-none focus:ring-4 focus:ring-gold/40"
            />
            <button
              type="submit"
              className="rounded-full bg-ink px-5 py-3 font-display text-sm uppercase tracking-widest text-cream-50"
            >
              Guess
            </button>
          </form>
        </div>
      </section>

      <aside className="space-y-4">
        {onDuelComplete ? (
          <DuelSubmitPanel onSubmit={() => onDuelComplete({ attempts: Math.max(1, guesses.length), durationMs: Date.now() - startedAt, solved })} />
        ) : (
          <ScorePanel completed={guesses.length} total={maxAttempts} score={score} error={submitError} onSubmit={submitScore} />
        )}
        <div className="rounded-2xl border-4 border-ink bg-cream-100 p-5 shadow-card-lift">
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink">Status</p>
          <p className="mt-3 text-sm leading-6 text-ink-soft">
            {solved ? 'Ready to submit.' : 'Enter a full surname to add a row.'}
          </p>
        </div>
      </aside>
      {result && <ResultModal result={result} onClose={() => setResult(null)} />}
    </div>
  );
}

function tileStatus(index: number): LetterStatus {
  if (index % 4 === 1) return 'correct';
  if (index % 4 === 2) return 'present';
  return 'absent';
}

function tileTone(status: LetterStatus) {
  if (status === 'correct') return 'bg-pitch-jersey text-cream-50';
  if (status === 'present') return 'bg-gold text-ink';
  return 'bg-ink text-cream-50';
}

function ResultModal({ result, onClose }: { result: SubmitResult; onClose: () => void }) {
  const title = result.solved ? 'Golazo!' : 'Almost.';
  const detail = result.solved
    ? result.streak ? `Score saved. Streak is now ${result.streak}.` : 'Score saved.'
    : 'Score saved as incomplete. Check the solution and run it back.';

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/65 px-4">
      <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-[1fr_1fr]">
        <section className="border-4 border-ink bg-cream-50 p-8 shadow-card-lift">
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-gold-dark">
            {result.solved ? 'Solved' : 'Result'}
          </p>
          <h2 className="mt-2 font-display text-6xl leading-none text-ink">{title}</h2>
          <p className="mt-3 text-sm leading-6 text-ink-soft">{detail}</p>
          <div className="mt-6 rounded-xl border-4 border-ink bg-gold p-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-soft">Score</p>
            <p className="font-display text-5xl text-ink">{result.score}</p>
          </div>
        </section>

        <section className="border-4 border-ink bg-cream-50 p-6 shadow-card-lift">
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink">Solution</p>
          <ResultDetails result={result} />
          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full rounded-full bg-ink py-4 font-display text-sm uppercase tracking-widest text-cream-50"
          >
            Keep playing
          </button>
        </section>
      </div>
    </div>
  );
}

function ResultDetails({ result }: { result: SubmitResult }) {
  const validation = result.validation;

  if (validation.kind === 'grid') {
    return (
      <div className="mt-4 max-h-64 space-y-2 overflow-auto pr-2">
        {Object.entries(validation.solution).map(([cell, answer]) => (
          <div key={cell} className="flex items-center justify-between gap-3 border-b border-ink/10 py-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-soft">{cell}</span>
            <span className={`text-right font-display text-sm uppercase ${
              validation.correctCells.includes(cell) ? 'text-pitch-jersey' : 'text-flame'
            }`}>
              {answer}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (validation.kind === 'connections') {
    return (
      <div className="mt-4 space-y-2">
        {validation.solution.map((group) => (
          <div key={group.category} className="rounded-xl border-2 border-ink bg-cream-100 p-3">
            <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink-soft">{group.category}</p>
            <p className="mt-1 font-display text-sm uppercase text-ink">{group.items.join(' / ')}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <p className="rounded-xl border-4 border-ink bg-pitch-jersey px-4 py-3 font-display text-3xl uppercase text-cream-50">
        {validation.answer}
      </p>
      <div className="mt-4 space-y-2">
        {validation.rows.map((row, index) => (
          <div key={`${row.guess}-${index}`} className="flex gap-1">
            {row.guess.split('').map((letter, letterIndex) => (
              <span
                key={`${row.guess}-${letterIndex}`}
                className={`grid h-8 w-8 place-items-center rounded border-2 border-ink font-display text-sm ${tileTone(row.statuses[letterIndex])}`}
              >
                {letter}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
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

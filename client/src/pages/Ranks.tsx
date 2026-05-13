import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, extractApiError } from '../api/client';
import { Wordmark } from '../components/Wordmark';

type RankTab = 'elo' | 'daily' | 'alltime';

interface EloEntry {
  rank: number;
  username: string;
  elo: number;
  wins: number;
  losses: number;
  streak: number;
}

interface DailyEntry {
  rank: number;
  username: string;
  puzzleType: string;
  score: number;
  attempts: number;
  durationMs: number;
}

interface AllTimeEntry {
  rank: number;
  username: string;
  totalScore: number;
  played: number;
}

type Entry = EloEntry | DailyEntry | AllTimeEntry;

const ENDPOINTS: Record<RankTab, string> = {
  elo: '/api/leaderboard/elo',
  daily: '/api/leaderboard/daily',
  alltime: '/api/leaderboard/alltime',
};

export default function Ranks() {
  const [tab, setTab] = useState<RankTab>('elo');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get<{ entries: Entry[] }>(ENDPOINTS[tab])
      .then((res) => setEntries(res.data.entries))
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <div className="min-h-screen bg-cream-50 text-ink">
      <header className="border-b border-ink/10 bg-cream-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Wordmark variant="dark" size="sm" />
          <Link to="/" className="font-mono text-[11px] uppercase tracking-widest text-ink-soft hover:text-ink">
            Back to Today
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-gold-dark">
          Leaderboards
        </p>
        <div className="mt-2 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="font-display text-6xl leading-[0.95] text-ink lg:text-7xl">
            Climb the<br />table.
          </h1>
          <div className="flex rounded-full border-2 border-ink bg-cream-100 p-1">
            {(['elo', 'daily', 'alltime'] as RankTab[]).map((nextTab) => (
              <button
                key={nextTab}
                type="button"
                onClick={() => setTab(nextTab)}
                className={`rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-widest transition-colors ${
                  tab === nextTab ? 'bg-ink text-cream-50' : 'text-ink-soft hover:text-ink'
                }`}
              >
                {labelForTab(nextTab)}
              </button>
            ))}
          </div>
        </div>

        <section className="mt-10 overflow-hidden rounded-2xl border-2 border-ink bg-cream-100">
          <div className="grid grid-cols-[72px_1fr_140px_140px] gap-3 border-b-2 border-ink bg-ink px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-cream-50">
            <span>Rank</span>
            <span>Player</span>
            <span>{tab === 'elo' ? 'ELO' : 'Score'}</span>
            <span>{tab === 'daily' ? 'Puzzle' : 'Record'}</span>
          </div>

          {loading && <RankMessage text="Loading table..." />}
          {error && <RankMessage text={error} tone="error" />}
          {!loading && !error && entries.length === 0 && <RankMessage text="No scores yet. First one on the board gets the story." />}

          {!loading && !error && entries.map((entry) => (
            <div
              key={`${entry.rank}-${entry.username}`}
              className="grid grid-cols-[72px_1fr_140px_140px] gap-3 border-b border-ink/10 px-5 py-4 last:border-b-0"
            >
              <span className="font-display text-2xl text-ink">#{entry.rank}</span>
              <span>
                <span className="font-display text-xl text-ink">{entry.username}</span>
                <span className="block font-mono text-[10px] uppercase tracking-widest text-ink-soft">
                  {subtitleForEntry(tab, entry)}
                </span>
              </span>
              <span className="font-display text-2xl text-ink">{primaryValue(tab, entry)}</span>
              <span className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">
                {secondaryValue(tab, entry)}
              </span>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

function RankMessage({ text, tone = 'muted' }: { text: string; tone?: 'muted' | 'error' }) {
  return (
    <div className={`px-5 py-10 text-center font-mono text-[11px] uppercase tracking-widest ${
      tone === 'error' ? 'text-flame' : 'text-ink-soft'
    }`}>
      {text}
    </div>
  );
}

function labelForTab(tab: RankTab) {
  if (tab === 'alltime') return 'All-time';
  return tab.toUpperCase();
}

function primaryValue(tab: RankTab, entry: Entry) {
  if (tab === 'elo') return (entry as EloEntry).elo;
  if (tab === 'daily') return (entry as DailyEntry).score;
  return (entry as AllTimeEntry).totalScore;
}

function secondaryValue(tab: RankTab, entry: Entry) {
  if (tab === 'elo') {
    const elo = entry as EloEntry;
    return `${elo.wins}W / ${elo.losses}L`;
  }
  if (tab === 'daily') return (entry as DailyEntry).puzzleType;
  return `${(entry as AllTimeEntry).played} played`;
}

function subtitleForEntry(tab: RankTab, entry: Entry) {
  if (tab === 'elo') return `${(entry as EloEntry).streak}-day streak`;
  if (tab === 'daily') return `${(entry as DailyEntry).attempts} attempts`;
  return 'season total';
}

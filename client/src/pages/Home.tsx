import { Link } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { Wordmark } from '../components/Wordmark';

const NAV_ITEMS = [
  { label: 'Today', to: '/' },
  { label: 'Duel', to: '/duel' },
  { label: 'Ranks', to: '/ranks' },
  { label: 'Profile', to: '/profile' },
];

export default function Home() {
  const { user, logout } = useAuth();

  const today = new Date()
    .toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    .toUpperCase();

  const initials = (user?.username ?? '??').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-cream-50 text-ink">
      {/* Top nav */}
      <header className="border-b border-ink/10 bg-cream-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4 lg:px-10">
          <div className="flex items-center gap-10">
            <Wordmark variant="dark" size="sm" />
            <nav className="hidden items-center gap-1 md:flex">
              {NAV_ITEMS.map((item) => {
                const active = item.label === 'Today';
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className={`rounded-full px-5 py-2 font-mono text-[12px] font-medium uppercase tracking-widest transition-colors ${
                      active
                        ? 'bg-ink text-cream-50'
                        : 'text-ink hover:bg-ink/5'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <StreakChip days={user?.streak ?? 0} />
            <button
              onClick={logout}
              title="Sign out"
              className="grid h-10 w-10 place-items-center rounded-full border-2 border-ink bg-gold font-display text-sm text-ink transition-transform hover:-translate-y-0.5"
            >
              {initials}
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-14">
        {/* Hero row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-ink-soft">
              {today}
            </p>
            <h1 className="mt-2 font-display text-6xl leading-[0.95] text-ink lg:text-7xl">
              Today's<br />match day.
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-md border-2 border-flame px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-flame">
              New set
            </span>
            <StreakChip days={user?.streak ?? 0} large />
          </div>
        </div>

        {/* Three game cards */}
        <section className="mt-10 grid gap-6 lg:grid-cols-3">
          <GameCard
            number="01"
            color="pitch-jersey"
            title="Football Grid"
            blurb="Place a player at every intersection."
            stats="—"
            status="Coming soon"
            icon={<GridIcon />}
          />
          <GameCard
            number="02"
            color="flame"
            title="Connections"
            blurb="Find four hidden football themes."
            stats="—"
            status="Coming soon"
            icon={<ConnectionsIcon />}
          />
          <GameCard
            number="03"
            color="gold"
            title="Soccer Wordle"
            blurb="Five letters. One footballer."
            stats="—"
            status="Coming soon"
            icon={<WordleIcon />}
          />
        </section>

        {/* Duel + Friends row */}
        <section className="mt-12 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-gold-dark">
              1v1 duel · soon
            </p>
            <h2 className="mt-2 font-display text-4xl leading-tight text-ink lg:text-5xl">
              Find a rival.<br />Solve. Win.
            </h2>
            <p className="mt-2 font-mono text-[12px] uppercase tracking-widest text-ink-soft">
              Bruno is wiring this up. Hot-seat first, online next week.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                disabled
                className="rounded-full bg-gold px-6 py-3 font-display text-sm uppercase tracking-widest text-ink shadow-card-lift transition-transform disabled:cursor-not-allowed disabled:opacity-50"
              >
                Quickplay
              </button>
              <button
                disabled
                className="rounded-full border-2 border-ink bg-cream-50 px-6 py-3 font-display text-sm uppercase tracking-widest text-ink transition-transform disabled:cursor-not-allowed disabled:opacity-50"
              >
                Invite friend
              </button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-2xl border-2 border-ink bg-cream-100 p-6">
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-3xl text-ink">Friends</h3>
                <span className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">
                  0 online
                </span>
              </div>
              <div className="mt-6">
                <EmptyFriends />
              </div>
            </div>
          </div>
        </section>

        {/* Footer credits */}
        <footer className="mt-16 border-t border-ink/10 pt-6 font-mono text-[11px] uppercase tracking-widest text-ink-soft">
          CEN&nbsp;3020 · Spring&nbsp;2026 · José · Hugo · Sebas · Bruno · Darius
        </footer>
      </main>
    </div>
  );
}

/* ---------- pieces ---------- */

function StreakChip({ days, large = false }: { days: number; large?: boolean }) {
  const cls = large
    ? 'gap-2 px-4 py-2 text-sm'
    : 'gap-1.5 px-3 py-1 text-[12px]';
  return (
    <div
      className={`inline-flex items-center rounded-full bg-flame font-mono font-bold uppercase tracking-widest text-cream-50 ${cls}`}
    >
      <span aria-hidden>★</span>
      <span>
        {days}-day streak
      </span>
    </div>
  );
}

interface GameCardProps {
  number: string;
  color: 'pitch-jersey' | 'flame' | 'gold';
  title: string;
  blurb: string;
  stats: string;
  status: string;
  icon: React.ReactNode;
}

function GameCard({ number, color, title, blurb, stats, status, icon }: GameCardProps) {
  const bgMap = {
    'pitch-jersey': 'bg-pitch-jersey',
    flame: 'bg-flame',
    gold: 'bg-gold',
  } as const;
  const textOnTile = color === 'gold' ? 'text-ink' : 'text-cream-50';

  return (
    <article className="group">
      <div
        className={`relative flex h-44 items-center justify-center overflow-hidden rounded-2xl border-2 border-ink ${bgMap[color]}`}
      >
        <div className={`absolute left-4 bottom-3 font-mono text-[11px] font-bold uppercase tracking-widest ${textOnTile}`}>
          No.&nbsp;{number}
        </div>
        <div className={`${textOnTile}`}>{icon}</div>
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl text-ink">{title}</h3>
          <p className="mt-1 text-sm text-ink-soft">{blurb}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-3">
        <div className="font-mono text-[11px] font-medium uppercase tracking-widest text-ink-soft">
          {status}
        </div>
        <button
          disabled
          className="rounded-full bg-ink px-4 py-2 font-display text-[11px] uppercase tracking-widest text-cream-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Play →
        </button>
      </div>
    </article>
  );
}

function EmptyFriends() {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-ink-soft">
        No friends yet
      </p>
      <p className="max-w-xs text-sm text-ink-soft">
        Friends list ships with the duel feature next week. You'll be able to invite by
        username and challenge them to today's set.
      </p>
    </div>
  );
}

/* ---------- icons (sketchy white-on-color, NYT Games style) ---------- */

function GridIcon() {
  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="square">
      <rect x="8" y="8" width="64" height="64" rx="4" />
      <line x1="29.3" y1="8" x2="29.3" y2="72" />
      <line x1="50.6" y1="8" x2="50.6" y2="72" />
      <line x1="8" y1="29.3" x2="72" y2="29.3" />
      <line x1="8" y1="50.6" x2="72" y2="50.6" />
    </svg>
  );
}

function ConnectionsIcon() {
  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20" fill="none" stroke="currentColor" strokeWidth="5">
      <rect x="14" y="10" width="22" height="60" rx="3" fill="currentColor" stroke="none" />
      <rect x="44" y="10" width="22" height="60" rx="3" />
    </svg>
  );
}

function WordleIcon() {
  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="square">
      <line x1="14" y1="22" x2="66" y2="22" />
      <line x1="14" y1="40" x2="66" y2="40" />
      <line x1="14" y1="58" x2="66" y2="58" />
    </svg>
  );
}

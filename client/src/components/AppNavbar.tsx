import { Link } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { Wordmark } from './Wordmark';

export type AppNavPage = 'today' | 'duel' | 'ranks' | 'profile' | 'admin';

const BASE_ITEMS: Array<{ label: string; to: string; key: AppNavPage }> = [
  { label: 'Today', to: '/', key: 'today' },
  { label: 'Duel', to: '/duel', key: 'duel' },
  { label: 'Ranks', to: '/ranks', key: 'ranks' },
  { label: 'Profile', to: '/profile', key: 'profile' },
];

export function AppNavbar({ activePage }: { activePage: AppNavPage }) {
  const { user, logout } = useAuth();
  const items = user?.role === 'admin'
    ? [...BASE_ITEMS, { label: 'Admin', to: '/admin', key: 'admin' as const }]
    : BASE_ITEMS;

  const initials = (user?.username ?? '??').slice(0, 2).toUpperCase();

  return (
    <header className="border-b border-ink/10 bg-cream-50">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4 lg:px-10">
        <div className="flex min-w-0 items-center gap-4 md:gap-10">
          <Wordmark variant="dark" size="sm" />
          <nav className="hidden items-center gap-1 md:flex">
            {items.map((item) => {
              const active = item.key === activePage;
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={`rounded-full px-5 py-2 font-mono text-[12px] font-medium uppercase tracking-widest transition-colors ${
                    active ? 'bg-ink text-cream-50' : 'text-ink hover:bg-ink/5'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="hidden items-center gap-4 sm:flex">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-flame px-3 py-1 font-mono text-[12px] font-bold uppercase tracking-widest text-cream-50">
            <span aria-hidden>★</span>
            <span>{user?.streak ?? 0}-day streak</span>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Sign out"
            className="grid h-10 w-10 place-items-center rounded-full border-2 border-ink bg-gold font-display text-sm text-ink transition-transform hover:-translate-y-0.5"
          >
            {initials}
          </button>
        </div>

        <nav className="flex w-full items-center gap-1 overflow-x-auto pb-1 md:hidden">
          {items.map((item) => {
            const active = item.key === activePage;
            return (
              <Link
                key={`${item.key}-mobile`}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={`whitespace-nowrap rounded-full px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-widest transition-colors ${
                  active ? 'bg-ink text-cream-50' : 'text-ink hover:bg-ink/5'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

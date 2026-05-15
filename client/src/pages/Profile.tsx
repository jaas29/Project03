import { Link } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { AppNavbar } from '../components/AppNavbar';

export default function Profile() {
  const { user, logout } = useAuth();
  const initials = (user?.username ?? '??').slice(0, 2).toUpperCase();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-cream-50 text-ink">
      <AppNavbar activePage="profile" />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-gold-dark">
          Player profile
        </p>
        <section className="mt-3 rounded-2xl border-2 border-ink bg-cream-100 p-6 shadow-card-lift sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <div className="grid h-20 w-20 place-items-center rounded-full border-2 border-ink bg-gold font-display text-3xl text-ink">
                {initials}
              </div>
              <div>
                <h1 className="font-display text-5xl leading-none text-ink">{user?.username}</h1>
                <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-ink-soft">
                  {isAdmin ? 'Admin account' : 'Registered player'}
                </p>
              </div>
            </div>
            {isAdmin && (
              <Link
                to="/admin"
                className="rounded-full bg-ink px-5 py-3 text-center font-display text-sm uppercase tracking-widest text-cream-50 transition-transform hover:-translate-y-0.5"
              >
                Admin room
              </Link>
            )}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <ProfileStat label="ELO" value={user?.elo ?? 1000} tone="gold" />
            <ProfileStat label="Streak" value={`${user?.streak ?? 0} days`} tone="pitch" />
            <ProfileStat label="Role" value={user?.role ?? 'user'} tone="flame" />
          </div>
        </section>

        <section className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border-2 border-ink/10 bg-cream-100 p-6">
            <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-ink-soft">
              Next contribution
            </p>
            <h2 className="mt-2 font-display text-3xl text-ink">Game shells</h2>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Wire the daily puzzle cards into real play screens for Grid, Connections, and Wordle.
              This is the clearest Jose-owned gap before the May 13 sync.
            </p>
          </div>
          <div className="rounded-2xl border-2 border-ink/10 bg-cream-100 p-6">
            <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-ink-soft">
              Session
            </p>
            <h2 className="mt-2 font-display text-3xl text-ink">Signed in</h2>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Your auth flow is working from this account. Use sign out only when testing the login
              and register screens.
            </p>
            <button
              type="button"
              onClick={logout}
              className="mt-5 rounded-full border-2 border-ink px-5 py-3 font-display text-sm uppercase tracking-widest text-ink transition-transform hover:-translate-y-0.5"
            >
              Sign out
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

function ProfileStat({ label, value, tone }: { label: string; value: string | number; tone: 'gold' | 'pitch' | 'flame' }) {
  const toneClasses = {
    gold: 'border-gold bg-gold/20',
    pitch: 'border-pitch-jersey bg-pitch-jersey/10',
    flame: 'border-flame bg-flame/10',
  };

  return (
    <div className={`rounded-2xl border-2 p-5 ${toneClasses[tone]}`}>
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-soft">{label}</p>
      <p className="mt-1 font-display text-3xl capitalize text-ink">{value}</p>
    </div>
  );
}

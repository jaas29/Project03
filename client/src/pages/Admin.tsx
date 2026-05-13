import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api, extractApiError } from '../api/client';
import { Wordmark } from '../components/Wordmark';
import { useAuth } from '../store/auth';

interface AdminUser {
  _id: string;
  username: string;
  email: string;
  role: string;
  elo: number;
  createdAt: string;
}

export default function Admin() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    api
      .get<{ users: AdminUser[] }>('/api/admin/users')
      .then((res) => setUsers(res.data.users))
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, [user?.role]);

  if (user?.role !== 'admin') return <Navigate to="/" replace />;

  async function regeneratePuzzles() {
    setMessage(null);
    setError(null);
    try {
      const { data } = await api.post<{ message: string }>('/api/admin/puzzles/regenerate');
      setMessage(data.message);
    } catch (err) {
      setError(extractApiError(err));
    }
  }

  async function banUser(id: string) {
    setMessage(null);
    setError(null);
    try {
      const { data } = await api.patch<{ message: string }>(`/api/admin/users/${id}/ban`);
      setMessage(data.message);
      setUsers((current) => current.filter((candidate) => candidate._id !== id));
    } catch (err) {
      setError(extractApiError(err));
    }
  }

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
        <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-flame">
          Admin
        </p>
        <div className="mt-2 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="font-display text-6xl leading-[0.95] text-ink lg:text-7xl">
            Control<br />room.
          </h1>
          <button
            type="button"
            onClick={regeneratePuzzles}
            className="rounded-full bg-ink px-6 py-3 font-display text-sm uppercase tracking-widest text-cream-50 transition-transform hover:-translate-y-0.5"
          >
            Regenerate puzzles
          </button>
        </div>

        {(message || error) && (
          <div className={`mt-8 rounded-2xl border px-4 py-3 text-sm ${
            error ? 'border-flame/30 bg-flame/5 text-flame' : 'border-pitch-jersey/30 bg-pitch-jersey/5 text-pitch-jersey'
          }`}>
            {error ?? message}
          </div>
        )}

        <section className="mt-8 overflow-hidden rounded-2xl border-2 border-ink bg-cream-100">
          <div className="grid grid-cols-[1fr_220px_100px_120px] gap-3 border-b-2 border-ink bg-ink px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-cream-50">
            <span>User</span>
            <span>Email</span>
            <span>Role</span>
            <span>Action</span>
          </div>
          {loading && <AdminMessage text="Loading users..." />}
          {!loading && users.length === 0 && <AdminMessage text="No users found." />}
          {!loading && users.map((candidate) => (
            <div
              key={candidate._id}
              className="grid grid-cols-[1fr_220px_100px_120px] gap-3 border-b border-ink/10 px-5 py-4 last:border-b-0"
            >
              <span>
                <span className="font-display text-xl text-ink">{candidate.username}</span>
                <span className="block font-mono text-[10px] uppercase tracking-widest text-ink-soft">
                  ELO {candidate.elo}
                </span>
              </span>
              <span className="truncate text-sm text-ink-soft">{candidate.email}</span>
              <span className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">{candidate.role}</span>
              <button
                type="button"
                onClick={() => banUser(candidate._id)}
                disabled={candidate.role === 'admin'}
                className="rounded-full border-2 border-flame px-4 py-2 font-display text-[11px] uppercase tracking-widest text-flame transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Ban
              </button>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

function AdminMessage({ text }: { text: string }) {
  return (
    <div className="px-5 py-10 text-center font-mono text-[11px] uppercase tracking-widest text-ink-soft">
      {text}
    </div>
  );
}

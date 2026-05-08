import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { Field } from '../components/Field';
import { useAuth } from '../store/auth';
import { extractApiError } from '../api/client';

interface LocationState {
  from?: string;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      const dest = (location.state as LocationState | null)?.from ?? '/';
      navigate(dest, { replace: true });
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Lace up. Log in."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-semibold text-ink underline underline-offset-4">
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-flame/30 bg-flame/5 px-4 py-3 text-sm text-flame"
          >
            {error}
          </div>
        )}

        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="diogo@example.com"
        />

        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        <button
          type="submit"
          disabled={submitting || !email || !password}
          className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-ink px-6 py-4 font-display text-sm uppercase tracking-widest text-cream-50 transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-ink/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </AuthLayout>
  );
}

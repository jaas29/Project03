import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { Field } from '../components/Field';
import { useAuth } from '../store/auth';
import { extractApiError } from '../api/client';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const passwordTooShort = password.length > 0 && password.length < 8;
  const usernameInvalid = username.length > 0 && !/^[a-zA-Z0-9_]{3,24}$/.test(username);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(email, username, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  const disabled =
    submitting || !email || !username || !password || passwordTooShort || usernameInvalid;

  return (
    <AuthLayout
      eyebrow="Create your album"
      title="Sign up to play."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-ink underline underline-offset-4">
            Log in
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
          label="Username"
          name="username"
          type="text"
          autoComplete="username"
          required
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="streetfooter"
          hint="3–24 characters · letters, numbers, underscore"
          error={usernameInvalid ? 'Use 3–24 letters, numbers, or underscores.' : undefined}
        />

        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="diogo@example.com"
        />

        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          error={passwordTooShort ? 'Minimum 8 characters.' : undefined}
        />

        <button
          type="submit"
          disabled={disabled}
          className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-ink px-6 py-4 font-display text-sm uppercase tracking-widest text-cream-50 transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-ink/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {submitting ? 'Creating account…' : 'Create account'}
        </button>

        <p className="pt-2 text-center text-xs leading-relaxed text-ink-soft">
          By creating an account you agree to play fair and not abuse the daily set.
        </p>
      </form>
    </AuthLayout>
  );
}

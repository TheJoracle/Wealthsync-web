'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type Mode = 'login' | 'register';

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    const supabase = createClient();

    if (mode === 'register') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
      } else if (data.user && !data.session) {
        setInfo('Check je email om je account te bevestigen.');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    }

    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium text-[var(--text-secondary)]">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--brand)]"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-medium text-[var(--text-secondary)]">
          Wachtwoord
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--brand)]"
        />
        {mode === 'register' && (
          <p className="text-xs text-[var(--text-muted)]">Minimaal 8 tekens.</p>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-[var(--danger)] bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}
      {info && (
        <div className="rounded-lg border border-[var(--brand)] bg-[var(--brand)]/10 px-4 py-3 text-sm text-[var(--brand)]">
          {info}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 rounded-lg bg-gradient-to-r from-[var(--brand)] to-[var(--brand-hover)] px-4 py-3 font-semibold text-[var(--on-brand)] transition hover:brightness-110 disabled:opacity-50"
      >
        {loading ? '...' : mode === 'login' ? 'Inloggen' : 'Account aanmaken'}
      </button>

      <p className="text-center text-sm text-[var(--text-secondary)]">
        {mode === 'login' ? (
          <>
            Nog geen account?{' '}
            <Link href="/register" className="text-[var(--brand)] hover:underline">
              Registreer
            </Link>
          </>
        ) : (
          <>
            Al een account?{' '}
            <Link href="/login" className="text-[var(--brand)] hover:underline">
              Inloggen
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

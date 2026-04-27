'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Wachtwoord</Label>
          {mode === 'login' && (
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground hover:text-primary hover:underline"
            >
              Vergeten?
            </Link>
          )}
        </div>
        <Input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {mode === 'register' && (
          <p className="text-xs text-muted-foreground">Minimaal 8 tekens.</p>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {info && (
        <div className="rounded-md border border-primary/50 bg-primary/10 px-4 py-3 text-sm text-primary">
          {info}
        </div>
      )}

      <Button type="submit" disabled={loading} size="lg" className="mt-2">
        {loading && <Loader2 className="animate-spin" />}
        {mode === 'login' ? 'Inloggen' : 'Account aanmaken'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {mode === 'login' ? (
          <>
            Nog geen account?{' '}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Registreer
            </Link>
          </>
        ) : (
          <>
            Al een account?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Inloggen
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

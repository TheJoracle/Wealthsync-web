import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ThemeToggle } from '@/components/theme-toggle';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="flex flex-col flex-1 min-h-screen">
      <header className="border-b border-[var(--border)] px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="bg-gradient-to-r from-[var(--brand)] to-[var(--brand-secondary)] bg-clip-text text-2xl font-black text-transparent">
            WealthSync
          </h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Track your portfolio
          </h2>
          <p className="mt-6 text-lg text-[var(--text-secondary)]">
            Eén dashboard voor al je assets — aandelen, ETFs, crypto en edelmetalen.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="rounded-lg bg-gradient-to-r from-[var(--brand)] to-[var(--brand-hover)] px-6 py-3 font-semibold text-[var(--on-brand)] transition hover:brightness-110"
            >
              Account aanmaken
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-[var(--border)] px-6 py-3 font-semibold text-[var(--text-primary)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
            >
              Inloggen
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

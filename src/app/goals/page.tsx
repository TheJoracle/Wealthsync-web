import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ThemeToggle } from '@/components/theme-toggle';
import { GoalCard, type Goal } from '@/components/goal-card';
import { RetirementCalculator } from '@/components/retirement-calculator';

export const metadata = { title: 'Doelen — WealthSync' };

export default async function GoalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: goals }, { data: assets }] = await Promise.all([
    supabase
      .from('goals')
      .select('id, name, target_amount, current_amount, target_date, status, created_at')
      .order('created_at', { ascending: false })
      .returns<Goal[]>(),
    supabase.from('assets').select('value'),
  ]);

  const portfolioValue = (assets ?? []).reduce((s, a) => s + Number(a.value), 0);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-[var(--border)] px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link
            href="/dashboard"
            className="bg-gradient-to-r from-[var(--brand)] to-[var(--brand-secondary)] bg-clip-text text-2xl font-black text-transparent"
          >
            WealthSync
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Doelen</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Stel financiële doelen en volg je voortgang.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--brand)]"
            >
              ← Dashboard
            </Link>
            <Link
              href="/goals/new"
              className="rounded-lg bg-gradient-to-r from-[var(--brand)] to-[var(--brand-hover)] px-4 py-2 text-sm font-semibold text-[var(--on-brand)] transition hover:brightness-110"
            >
              + Nieuw doel
            </Link>
          </div>
        </div>

        {!goals || goals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-card)] p-8 text-center">
            <p className="text-[var(--text-secondary)]">
              Nog geen doelen. Klik op <strong>Nieuw doel</strong> om te beginnen.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {goals.map((g) => (
              <GoalCard key={g.id} goal={g} />
            ))}
          </div>
        )}

        <section className="mt-10">
          <RetirementCalculator initialSavings={portfolioValue} />
        </section>
      </main>
    </div>
  );
}

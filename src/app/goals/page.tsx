import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AppHeader } from '@/components/app-header';
import { GoalCard, type Goal } from '@/components/goal-card';
import { RetirementCalculator } from '@/components/retirement-calculator';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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
      <AppHeader userEmail={user.email} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Doelen</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Stel financiële doelen en volg je voortgang.
            </p>
          </div>
          <Link href="/goals/new" className={buttonVariants({ size: 'lg' })}>
            <Plus />
            Nieuw doel
          </Link>
        </div>

        {!goals || goals.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">
                Nog geen doelen. Klik op <strong>Nieuw doel</strong> om te beginnen.
              </p>
            </CardContent>
          </Card>
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

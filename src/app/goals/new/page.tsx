import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { GoalForm } from '@/components/goal-form';
import { addGoal } from '@/app/goals/actions';

export const metadata = { title: 'Nieuw doel — WealthSync' };

export default async function NewGoalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: assets } = await supabase.from('assets').select('value');
  const portfolioValue = (assets ?? []).reduce((s, a) => s + Number(a.value), 0);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-3xl font-bold">Nieuw doel</h1>
      <GoalForm
        portfolioValue={portfolioValue}
        onSubmit={addGoal}
        submitLabel="Doel opslaan"
      />
    </div>
  );
}

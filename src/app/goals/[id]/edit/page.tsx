import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { GoalForm } from '@/components/goal-form';
import { updateGoal } from '@/app/goals/actions';

export const metadata = { title: 'Doel bewerken — WealthSync' };

export default async function EditGoalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: goal }, { data: assets }] = await Promise.all([
    supabase
      .from('goals')
      .select('id, name, target_amount, current_amount, target_date')
      .eq('id', id)
      .single(),
    supabase.from('assets').select('value'),
  ]);

  if (!goal) notFound();
  const portfolioValue = (assets ?? []).reduce((s, a) => s + Number(a.value), 0);

  const updateWithId = async (formData: FormData) => {
    'use server';
    return updateGoal(id, formData);
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-3xl font-bold">Doel bewerken</h1>
      <GoalForm
        initial={{
          name: goal.name,
          target_amount: Number(goal.target_amount),
          current_amount: Number(goal.current_amount),
          target_date: goal.target_date,
        }}
        portfolioValue={portfolioValue}
        onSubmit={updateWithId}
        submitLabel="Wijzigingen opslaan"
      />
    </div>
  );
}

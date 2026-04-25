'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type GoalInput = {
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
};

function parseForm(formData: FormData): { data?: GoalInput; error?: string } {
  const name = String(formData.get('name') ?? '').trim();
  const target_amount = Number(formData.get('target_amount'));
  const current_amount = Number(formData.get('current_amount') ?? 0);
  const dateRaw = String(formData.get('target_date') ?? '').trim();
  const target_date = dateRaw === '' ? null : dateRaw;

  if (!name) return { error: 'Naam is verplicht' };
  if (!Number.isFinite(target_amount) || target_amount <= 0) {
    return { error: 'Doelbedrag moet een positief getal zijn' };
  }
  if (!Number.isFinite(current_amount) || current_amount < 0) {
    return { error: 'Huidig bedrag moet een niet-negatief getal zijn' };
  }

  return { data: { name, target_amount, current_amount, target_date } };
}

export async function addGoal(formData: FormData) {
  const parsed = parseForm(formData);
  if (parsed.error) return { error: parsed.error };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase.from('goals').insert({
    ...parsed.data,
    user_id: user.id,
    status: 'active',
  });
  if (error) return { error: error.message };

  revalidatePath('/goals');
  redirect('/goals');
}

export async function updateGoal(id: number, formData: FormData) {
  const parsed = parseForm(formData);
  if (parsed.error || !parsed.data) return { error: parsed.error ?? 'Invalid input' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('goals')
    .update(parsed.data)
    .eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/goals');
  redirect('/goals');
}

export async function deleteGoal(id: number) {
  const supabase = await createClient();
  const { error } = await supabase.from('goals').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/goals');
}

/** Set current_amount to the user's current total portfolio value. */
export async function syncGoalToPortfolio(id: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: assets } = await supabase
    .from('assets')
    .select('value');
  const total = (assets ?? []).reduce((s, a) => s + Number(a.value), 0);

  const { error } = await supabase
    .from('goals')
    .update({ current_amount: total })
    .eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/goals');
}

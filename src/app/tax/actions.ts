'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { calculateBox3 } from '@/lib/box3';

/**
 * Persists a Box 3 snapshot for the given tax year. The snapshot uses the
 * user's CURRENT total portfolio value as a proxy for January 1 wealth —
 * users typically run this near year-end, so a manual override field on the
 * UI is provided too.
 */
export async function saveBox3Snapshot(formData: FormData) {
  const year = Number(formData.get('year'));
  const wealthRaw = formData.get('wealth');
  const couple = formData.get('couple') === 'on';

  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    return { error: 'Ongeldig belastingjaar' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  let wealth: number;
  if (wealthRaw && String(wealthRaw).trim() !== '') {
    wealth = Number(wealthRaw);
    if (!Number.isFinite(wealth) || wealth < 0) {
      return { error: 'Ongeldig vermogen' };
    }
  } else {
    const { data: assets } = await supabase.from('assets').select('value');
    wealth = (assets ?? []).reduce((s, a) => s + Number(a.value), 0);
  }

  const result = calculateBox3(wealth, { year, couple });
  const snapshotDate = `${year}-01-01`;

  const { error } = await supabase.from('box3_snapshots').upsert(
    {
      user_id: user.id,
      snapshot_date: snapshotDate,
      year,
      total_wealth: wealth,
      tax_free_allowance: result.taxFreeAllowance,
      taxable_wealth: result.taxableWealth,
      bracket1_amount: result.brackets[0]?.amount ?? 0,
      bracket1_rate: result.brackets[0]?.rate ?? 0,
      bracket2_amount: result.brackets[1]?.amount ?? 0,
      bracket2_rate: result.brackets[1]?.rate ?? 0,
      bracket3_amount: result.brackets[2]?.amount ?? 0,
      bracket3_rate: result.brackets[2]?.rate ?? 0,
      deemed_return: result.deemedReturn,
      tax_rate: 0.36,
      estimated_tax: result.estimatedTax,
    },
    { onConflict: 'user_id,snapshot_date' },
  );
  if (error) return { error: error.message };

  revalidatePath('/tax');
  return { ok: true };
}

export async function deleteBox3Snapshot(snapshotDate: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('box3_snapshots')
    .delete()
    .eq('snapshot_date', snapshotDate);
  if (error) return { error: error.message };

  revalidatePath('/tax');
}

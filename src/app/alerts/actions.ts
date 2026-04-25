'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const CONDITIONS = ['above', 'below'] as const;
type Condition = (typeof CONDITIONS)[number];

type AlertInput = {
  asset_id: number;
  symbol: string;
  target_price: number;
  condition: Condition;
};

function parseForm(formData: FormData): { data?: AlertInput; error?: string } {
  const asset_id = Number(formData.get('asset_id'));
  const target_price = Number(formData.get('target_price'));
  const condition = String(formData.get('condition') ?? '') as Condition;
  const symbol = String(formData.get('symbol') ?? '').trim().toUpperCase();

  if (!Number.isFinite(asset_id) || asset_id <= 0) return { error: 'Kies een asset' };
  if (!Number.isFinite(target_price) || target_price <= 0) {
    return { error: 'Doelprijs moet positief zijn' };
  }
  if (!CONDITIONS.includes(condition)) return { error: 'Conditie ongeldig' };
  if (!symbol) return { error: 'Symbool ontbreekt' };

  return { data: { asset_id, symbol, target_price, condition } };
}

export async function addAlert(formData: FormData) {
  const parsed = parseForm(formData);
  if (parsed.error || !parsed.data) return { error: parsed.error ?? 'Invalid' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase.from('price_alerts').insert({
    ...parsed.data,
    user_id: user.id,
    is_active: true,
  });
  if (error) return { error: error.message };

  revalidatePath('/alerts');
  redirect('/alerts');
}

export async function deleteAlert(id: number) {
  const supabase = await createClient();
  const { error } = await supabase.from('price_alerts').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/alerts');
}

export async function toggleAlert(id: number, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('price_alerts')
    .update({ is_active: active })
    .eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/alerts');
}

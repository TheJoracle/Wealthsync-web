'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TRANSACTION_TYPES, type TransactionType } from '@/app/transactions/types';

type TxInput = {
  type: TransactionType;
  symbol: string;
  quantity: number;
  price_per_unit: number;
  total_value: number;
  currency: string;
  fees: number;
  transaction_date: string;
  notes: string;
  asset_id: number | null;
};

function parseForm(formData: FormData): { data?: TxInput; error?: string } {
  const type = String(formData.get('type') ?? '') as TransactionType;
  const symbol = String(formData.get('symbol') ?? '').trim().toUpperCase();
  const quantity = Number(formData.get('quantity'));
  const price_per_unit = Number(formData.get('price_per_unit'));
  const total_value = Number(formData.get('total_value'));
  const currency = String(formData.get('currency') ?? 'EUR').trim();
  const fees = Number(formData.get('fees') ?? 0);
  const transaction_date = String(formData.get('transaction_date') ?? '').trim();
  const notes = String(formData.get('notes') ?? '');
  const assetIdRaw = formData.get('asset_id');
  const asset_id =
    !assetIdRaw || String(assetIdRaw) === '' ? null : Number(assetIdRaw);

  if (!TRANSACTION_TYPES.includes(type)) return { error: 'Ongeldig type' };
  if (!symbol) return { error: 'Symbool is verplicht' };
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { error: 'Aantal moet positief zijn' };
  }
  if (!Number.isFinite(price_per_unit) || price_per_unit < 0) {
    return { error: 'Prijs per stuk moet niet-negatief zijn' };
  }
  if (!Number.isFinite(total_value) || total_value < 0) {
    return { error: 'Totaalwaarde moet niet-negatief zijn' };
  }
  if (!transaction_date) return { error: 'Datum is verplicht' };

  return {
    data: {
      type, symbol, quantity, price_per_unit, total_value,
      currency, fees, transaction_date, notes, asset_id,
    },
  };
}

export async function addTransaction(formData: FormData) {
  const parsed = parseForm(formData);
  if (parsed.error || !parsed.data) return { error: parsed.error ?? 'Invalid input' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Auto-link asset_id by symbol if not provided
  let assetId = parsed.data.asset_id;
  if (assetId === null) {
    const { data: match } = await supabase
      .from('assets')
      .select('id')
      .eq('symbol', parsed.data.symbol)
      .limit(1);
    assetId = match?.[0]?.id ?? null;
  }

  const { error } = await supabase.from('transactions').insert({
    ...parsed.data,
    asset_id: assetId,
    user_id: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath('/transactions');
  redirect('/transactions');
}

export async function updateTransaction(id: number, formData: FormData) {
  const parsed = parseForm(formData);
  if (parsed.error || !parsed.data) return { error: parsed.error ?? 'Invalid input' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('transactions')
    .update(parsed.data)
    .eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/transactions');
  redirect('/transactions');
}

export async function deleteTransaction(id: number) {
  const supabase = await createClient();
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/transactions');
}

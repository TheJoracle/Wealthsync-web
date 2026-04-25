'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { enrichTicker } from '@/lib/asset-metadata';
import { ASSET_TYPES, type AssetType } from '@/app/assets/types';

type AssetInput = {
  name: string;
  symbol: string;
  type: AssetType;
  amount: number;
  value: number;
  purchase_price: number;
  notes: string;
  sector: string | null;
  geography: string | null;
};

function parseForm(formData: FormData): { data?: AssetInput; error?: string } {
  const name = String(formData.get('name') ?? '').trim();
  const symbol = String(formData.get('symbol') ?? '').trim().toUpperCase();
  const type = String(formData.get('type') ?? '').trim() as AssetType;
  const amount = Number(formData.get('amount'));
  const value = Number(formData.get('value'));
  const purchase_price = Number(formData.get('purchase_price') ?? 0);
  const notes = String(formData.get('notes') ?? '');
  const sectorRaw = String(formData.get('sector') ?? '').trim();
  const geographyRaw = String(formData.get('geography') ?? '').trim();
  const sector = sectorRaw === '' ? null : sectorRaw;
  const geography = geographyRaw === '' ? null : geographyRaw;

  if (!name) return { error: 'Name is required' };
  if (!symbol) return { error: 'Symbol is required' };
  if (!ASSET_TYPES.includes(type)) return { error: 'Invalid asset type' };
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'Amount must be a positive number' };
  if (!Number.isFinite(value) || value < 0) return { error: 'Value must be a non-negative number' };
  if (!Number.isFinite(purchase_price) || purchase_price < 0) {
    return { error: 'Purchase price must be a non-negative number' };
  }

  return {
    data: { name, symbol, type, amount, value, purchase_price, notes, sector, geography },
  };
}

export async function addAsset(formData: FormData) {
  const parsed = parseForm(formData);
  if (parsed.error || !parsed.data) return { error: parsed.error ?? 'Invalid input' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Auto-enrich missing fields from curated map / cache / API. Manual user
  // input always wins — `mergeMissing` only fills empty slots.
  const admin = createAdminClient();
  const meta = await enrichTicker(admin, parsed.data.symbol);
  const enriched = {
    ...parsed.data,
    name: parsed.data.name || meta.name || parsed.data.symbol,
    sector: parsed.data.sector || meta.sector || null,
    geography: parsed.data.geography || meta.geography || null,
  };

  const { error } = await supabase.from('assets').insert({
    ...enriched,
    user_id: user.id,
    source: 'manual',
    last_updated: new Date().toISOString(),
  });
  if (error) return { error: error.message };

  revalidatePath('/dashboard');
  redirect('/dashboard');
}

export async function updateAsset(id: number, formData: FormData) {
  const parsed = parseForm(formData);
  if (parsed.error) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from('assets')
    .update({ ...parsed.data, last_updated: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard');
  redirect('/dashboard');
}

export async function deleteAsset(id: number) {
  const supabase = await createClient();
  const { error } = await supabase.from('assets').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard');
}

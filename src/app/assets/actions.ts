'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { enrichTicker } from '@/lib/asset-metadata';
import { ASSET_TYPES, FIELD_RULES, type AssetType } from '@/app/assets/types';

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
  const type = String(formData.get('type') ?? '').trim() as AssetType;
  if (!name) return { error: 'Naam is verplicht' };
  if (!ASSET_TYPES.includes(type)) return { error: 'Ongeldig asset-type' };

  const rules = FIELD_RULES[type];

  // Symbol: required → must, optional → may, hidden → fall back to name-based default
  let symbol = String(formData.get('symbol') ?? '').trim().toUpperCase();
  if (rules.symbol === 'required' && !symbol) {
    return { error: `${rules.symbolLabel} is verplicht voor ${type}` };
  }
  if (!symbol) symbol = name.toUpperCase().replace(/\s+/g, '_').slice(0, 32);

  // Amount: positive number when required; default 1 when hidden
  let amount = Number(formData.get('amount'));
  if (rules.amount === 'required') {
    if (!Number.isFinite(amount) || amount <= 0) {
      return { error: `${rules.amountLabel} moet een positief getal zijn` };
    }
  } else if (rules.amount === 'hidden' || !Number.isFinite(amount) || amount <= 0) {
    amount = 1;
  }

  const value = Number(formData.get('value'));
  if (!Number.isFinite(value) || value < 0) {
    return { error: 'Huidige waarde moet een niet-negatief getal zijn' };
  }

  const purchase_price = Number(formData.get('purchase_price') ?? 0);
  if (!Number.isFinite(purchase_price) || purchase_price < 0) {
    return { error: 'Aankoopprijs moet een niet-negatief getal zijn' };
  }

  const notes = String(formData.get('notes') ?? '');
  const sectorRaw = String(formData.get('sector') ?? '').trim();
  const geographyRaw = String(formData.get('geography') ?? '').trim();
  const sector = sectorRaw === '' ? null : sectorRaw;
  const geography = geographyRaw === '' ? null : geographyRaw;

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

'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { parseCsv, pick, type CsvRow } from '@/lib/csv-parse';

type ImportResult = {
  inserted?: number;
  skipped?: number;
  total?: number;
  errors?: string[];
  error?: string;
};

/**
 * Map a Trading 212 CSV row to one of our transaction types.
 * Trading 212 "Action" values include:
 *   "Market buy", "Limit buy"     → buy
 *   "Market sell", "Limit sell"   → sell
 *   "Dividend (Ordinary)"          → dividend
 *   "Deposit"                       → deposit
 *   "Withdrawal"                    → withdrawal
 *   "Interest on cash"              → fee (not really, but close)
 *   "Currency conversion"           → fee (negligible)
 */
function mapAction(action: string): string | null {
  const a = action.toLowerCase();
  if (a.includes('buy')) return 'buy';
  if (a.includes('sell')) return 'sell';
  if (a.includes('dividend')) return 'dividend';
  if (a.includes('deposit')) return 'deposit';
  if (a.includes('withdrawal') || a.includes('withdraw')) return 'withdrawal';
  if (a.includes('interest')) return 'fee';
  return null;
}

function num(s: string | undefined): number {
  if (!s) return 0;
  // Trading 212 uses dot as decimal separator in EN exports, comma in NL
  const cleaned = s.replace(/[^\d,.\-]/g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parseT212Row(row: CsvRow): {
  type: string;
  symbol: string | null;
  quantity: number | null;
  price_per_unit: number | null;
  total_value: number;
  currency: string;
  fees: number;
  transaction_date: string;
  external_id: string | null;
} | null {
  const action = pick(row, 'Action');
  if (!action) return null;
  const type = mapAction(action);
  if (!type) return null;

  const ticker = pick(row, 'Ticker', 'Symbol') ?? null;
  const time = pick(row, 'Time', 'Date');
  if (!time) return null;
  const date = new Date(time).toISOString();

  const quantity = num(pick(row, 'No. of shares', 'Quantity', 'Shares'));
  const price = num(
    pick(row, 'Price / share', 'Price per share', 'Price') ?? '',
  );
  const total = num(pick(row, 'Total', 'Total (EUR)', 'Total amount'));
  const fees = num(pick(row, 'Currency conversion fee', 'Fee'));
  const externalId = pick(row, 'ID', 'Transaction ID') ?? null;

  return {
    type,
    symbol: ticker ? ticker.split('_')[0].toUpperCase() : null,
    quantity: type === 'deposit' || type === 'withdrawal' ? null : quantity || null,
    price_per_unit: type === 'deposit' || type === 'withdrawal' ? null : price || null,
    total_value: total,
    currency: pick(row, 'Currency (Total)', 'Currency') ?? 'EUR',
    fees,
    transaction_date: date,
    external_id: externalId,
  };
}

export async function importTrading212Csv(formData: FormData): Promise<ImportResult> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Geen bestand geselecteerd' };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { error: 'Bestand te groot (max 10MB)' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  let text: string;
  try {
    text = await file.text();
  } catch {
    return { error: 'Kon bestand niet lezen' };
  }

  const rows = parseCsv(text);
  if (rows.length === 0) return { error: 'CSV is leeg of ongeldig' };

  // Build asset symbol → id map for FK linking
  const { data: assets } = await supabase
    .from('assets')
    .select('id, symbol')
    .eq('user_id', user.id);
  const assetIdBySymbol = new Map<string, number>();
  for (const a of assets ?? []) {
    assetIdBySymbol.set(String(a.symbol).toUpperCase(), a.id);
  }

  // Pre-load existing tax_lot_ids for dedup
  const { data: existing } = await supabase
    .from('transactions')
    .select('tax_lot_id')
    .eq('user_id', user.id)
    .not('tax_lot_id', 'is', null);
  const seenIds = new Set((existing ?? []).map((e) => e.tax_lot_id));

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const parsed = parseT212Row(row);
    if (!parsed) { skipped++; continue; }
    if (parsed.external_id && seenIds.has(parsed.external_id)) {
      skipped++;
      continue;
    }

    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      asset_id: parsed.symbol ? assetIdBySymbol.get(parsed.symbol) ?? null : null,
      type: parsed.type,
      symbol: parsed.symbol,
      quantity: parsed.quantity,
      price_per_unit: parsed.price_per_unit,
      total_value: parsed.total_value,
      currency: parsed.currency,
      fees: parsed.fees,
      transaction_date: parsed.transaction_date,
      tax_lot_id: parsed.external_id,
      notes: 't212-csv',
    });
    if (error) {
      skipped++;
      if (errors.length < 5) errors.push(error.message);
      continue;
    }
    if (parsed.external_id) seenIds.add(parsed.external_id);
    inserted++;
  }

  revalidatePath('/transactions');
  return { inserted, skipped, total: rows.length, errors };
}

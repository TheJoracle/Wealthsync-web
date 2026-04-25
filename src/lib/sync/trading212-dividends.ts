import type { SupabaseClient } from '@supabase/supabase-js';

type T212Dividend = {
  ticker: string;
  reference?: string;
  quantity: number;
  amount: number; // amount in source currency
  grossAmountPerShare: number;
  amountInEuro: number;
  paidOn: string; // ISO timestamp
  type?: string;
};

export type DividendSyncResult = {
  inserted: number;
  skipped: number;
  total: number;
};

/**
 * Pulls dividend history from Trading 212 and inserts into dividend_payments.
 * Pagination: Trading 212 returns up to 50 per page with a cursor; we follow
 * the cursor until exhausted or we hit a hard cap (500 dividends — 5 years
 * worth for an active retail portfolio).
 */
export async function syncTrading212Dividends(
  supabase: SupabaseClient,
  userId: string,
  credentials: { api_key: string; api_secret?: string; mode?: 'live' | 'demo' },
): Promise<DividendSyncResult> {
  const host = credentials.mode === 'demo' ? 'demo.trading212.com' : 'live.trading212.com';
  const authHeader = credentials.api_secret
    ? `Basic ${Buffer.from(`${credentials.api_key}:${credentials.api_secret}`).toString('base64')}`
    : credentials.api_key;

  // Build symbol -> asset_id map for the user
  const { data: assets } = await supabase
    .from('assets')
    .select('id, symbol')
    .eq('user_id', userId);
  const symbolToAssetId = new Map<string, number>();
  for (const a of assets ?? []) {
    symbolToAssetId.set(String(a.symbol).toUpperCase(), a.id);
  }

  // Fetch existing dividend payment_dates per (asset_id, total_amount) to dedupe
  const { data: existing } = await supabase
    .from('dividend_payments')
    .select('asset_id, payment_date, total_amount')
    .eq('user_id', userId);
  const existingKeys = new Set(
    (existing ?? []).map(
      (e) => `${e.asset_id}|${e.payment_date}|${Number(e.total_amount).toFixed(2)}`,
    ),
  );

  let inserted = 0;
  let skipped = 0;
  let total = 0;
  let cursor: string | null = null;
  const HARD_CAP = 500;

  while (total < HARD_CAP) {
    const url = new URL(`https://${host}/api/v0/history/dividends`);
    url.searchParams.set('limit', '50');
    if (cursor) url.searchParams.set('cursor', cursor);

    const res = await fetch(url.toString(), {
      headers: { Authorization: authHeader, Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Dividends ${host} returned ${res.status}: ${body.slice(0, 160)}`);
    }
    const data = (await res.json()) as { items?: T212Dividend[]; nextPagePath?: string | null };
    const items = data.items ?? [];
    if (items.length === 0) break;

    for (const d of items) {
      total++;
      const symbol = d.ticker?.split('_')[0]?.toUpperCase();
      if (!symbol) { skipped++; continue; }

      const assetId = symbolToAssetId.get(symbol);
      if (!assetId) { skipped++; continue; }

      const paymentDate = d.paidOn?.slice(0, 10);
      const totalAmount = Number(d.amountInEuro);
      if (!paymentDate || !Number.isFinite(totalAmount) || totalAmount <= 0) {
        skipped++; continue;
      }

      const key = `${assetId}|${paymentDate}|${totalAmount.toFixed(2)}`;
      if (existingKeys.has(key)) { skipped++; continue; }

      const { error } = await supabase.from('dividend_payments').insert({
        user_id: userId,
        asset_id: assetId,
        symbol,
        amount_per_share: Number(d.grossAmountPerShare ?? 0),
        total_amount: totalAmount,
        payment_date: paymentDate,
        currency: 'EUR',
        dividend_type: d.type ?? 'regular',
      });
      if (error) { skipped++; continue; }
      existingKeys.add(key);
      inserted++;
    }

    if (!data.nextPagePath) break;
    // Trading 212's nextPagePath is a relative URL with the cursor query param.
    // Extract the cursor and loop.
    try {
      const next = new URL(data.nextPagePath, `https://${host}`);
      cursor = next.searchParams.get('cursor');
      if (!cursor) break;
    } catch {
      break;
    }
  }

  return { inserted, skipped, total };
}

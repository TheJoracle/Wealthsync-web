import type { SupabaseClient } from '@supabase/supabase-js';

type Trading212Position = {
  ticker: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  ppl: number;
  fxPpl?: number;
};

export type SyncResult = {
  upserted: number;
  skipped: number;
  total: number;
};

/**
 * Fetch current positions from Trading 212 and upsert them into the assets
 * table. Positions are keyed by symbol — if an asset with the same symbol
 * already exists for this user, we update it; otherwise we insert.
 *
 * Trading 212 has separate environments: production trading runs on
 * `live.trading212.com`, paper trading runs on `demo.trading212.com`.
 * API keys generated in one environment are 401 on the other.
 *
 * Runs under a service_role Supabase client (cross-user trust boundary is
 * the /api/sync route that validated the session).
 */
export async function syncTrading212(
  supabase: SupabaseClient,
  userId: string,
  credentials: { api_key: string; mode?: 'live' | 'demo' },
): Promise<SyncResult> {
  const host = credentials.mode === 'demo' ? 'demo.trading212.com' : 'live.trading212.com';
  const url = `https://${host}/api/v0/equity/portfolio`;
  const res = await fetch(url, {
    headers: { Authorization: credentials.api_key },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text();
    const hint =
      res.status === 401
        ? ` (key uit ${credentials.mode === 'demo' ? 'live' : 'practice'} account?)`
        : '';
    throw new Error(`Trading 212 ${host} returned ${res.status}${hint}: ${body.slice(0, 160)}`);
  }

  const positions = (await res.json()) as Trading212Position[];
  let upserted = 0;
  let skipped = 0;

  for (const p of positions) {
    if (!p.ticker || !Number.isFinite(p.quantity) || p.quantity <= 0) {
      skipped++;
      continue;
    }

    const symbol = normalizeTicker(p.ticker);
    const value = p.quantity * p.currentPrice;
    const purchasePrice = p.quantity * p.averagePrice;
    const now = new Date().toISOString();

    const { data: existing } = await supabase
      .from('assets')
      .select('id')
      .eq('user_id', userId)
      .eq('symbol', symbol)
      .limit(1);

    if (existing && existing.length > 0) {
      const { error } = await supabase
        .from('assets')
        .update({
          amount: p.quantity,
          value,
          purchase_price: purchasePrice,
          source: 'trading212',
          last_updated: now,
        })
        .eq('id', existing[0].id);
      if (error) { skipped++; continue; }
    } else {
      const { error } = await supabase.from('assets').insert({
        user_id: userId,
        name: symbol,
        symbol,
        type: guessAssetType(symbol),
        amount: p.quantity,
        value,
        purchase_price: purchasePrice,
        source: 'trading212',
        last_updated: now,
      });
      if (error) { skipped++; continue; }
    }
    upserted++;
  }

  return { upserted, skipped, total: positions.length };
}

function normalizeTicker(raw: string): string {
  // Trading 212 tickers look like "VWCEd_EQ" (dividend class) or "VWCE_EQ".
  // Strip the suffix after "_".
  return raw.split('_')[0].toUpperCase();
}

function guessAssetType(symbol: string): string {
  // Heuristic — refine when we add per-asset metadata later.
  // Most symbols Trading 212 exposes are shares/ETFs; users can correct.
  if (/^(VWCE|VGWE|XLKS|QUTM|NUKL|IWDA|VUSA)$/i.test(symbol)) return 'ETF';
  return 'Stock';
}

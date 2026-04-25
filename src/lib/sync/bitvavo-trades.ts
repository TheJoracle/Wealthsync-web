import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

type BitvavoTrade = {
  id: string; // unique trade id
  timestamp: number; // ms epoch
  market: string; // e.g. 'BTC-EUR'
  side: 'buy' | 'sell';
  amount: string;
  price: string;
  fee: string;
  feeCurrency: string;
  settled: boolean;
};

type BitvavoBalance = { symbol: string; available: string; inOrder: string };

export type TradesSyncResult = {
  inserted: number;
  skipped: number;
  total: number;
};

const BITVAVO_HOST = 'https://api.bitvavo.com';

function signRequest(
  apiSecret: string,
  timestamp: number,
  method: string,
  path: string,
  body = '',
): string {
  return crypto
    .createHmac('sha256', apiSecret)
    .update(`${timestamp}${method}${path}${body}`)
    .digest('hex');
}

async function bitvavoGet<T>(
  apiKey: string,
  apiSecret: string,
  path: string,
): Promise<T> {
  const ts = Date.now();
  const sig = signRequest(apiSecret, ts, 'GET', path);
  const res = await fetch(`${BITVAVO_HOST}${path}`, {
    headers: {
      'Bitvavo-Access-Key': apiKey,
      'Bitvavo-Access-Signature': sig,
      'Bitvavo-Access-Timestamp': String(ts),
      'Bitvavo-Access-Window': '10000',
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Bitvavo ${path} returned ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Pull full Bitvavo trade history for every market the user has held and
 * insert into the transactions table. Idempotent: dedupes on the Bitvavo
 * trade id (stored in tax_lot_id).
 */
export async function syncBitvavoTrades(
  supabase: SupabaseClient,
  userId: string,
  credentials: { api_key: string; api_secret: string },
): Promise<TradesSyncResult> {
  if (!credentials.api_secret) throw new Error('Bitvavo needs api_secret');

  // Markets to scan = current non-zero balances in non-EUR currencies. This
  // misses positions the user has fully sold before — fine for cost-basis
  // computation of currently held assets, which is what we care about.
  const balances = await bitvavoGet<BitvavoBalance[]>(
    credentials.api_key,
    credentials.api_secret,
    '/v2/balance',
  );
  const symbols = balances
    .filter((b) => b.symbol !== 'EUR' && Number(b.available) + Number(b.inOrder) > 0)
    .map((b) => b.symbol);

  // Pre-load existing trade IDs (stored in tax_lot_id) for this user to dedupe
  const { data: existing } = await supabase
    .from('transactions')
    .select('tax_lot_id')
    .eq('user_id', userId)
    .not('tax_lot_id', 'is', null);
  const existingIds = new Set((existing ?? []).map((e) => e.tax_lot_id));

  // Build symbol -> asset_id map
  const { data: assets } = await supabase
    .from('assets')
    .select('id, symbol')
    .eq('user_id', userId);
  const symbolToAssetId = new Map<string, number>();
  for (const a of assets ?? []) {
    symbolToAssetId.set(String(a.symbol).toUpperCase(), a.id);
  }

  let inserted = 0;
  let skipped = 0;
  let total = 0;

  for (const symbol of symbols) {
    const market = `${symbol}-EUR`;
    let oldestSeen: number | null = null;
    // Loop through pages: Bitvavo returns newest first, max 1000 per request.
    // Use `end` param to walk back. Cap loop at 10 pages = 10k trades.
    for (let page = 0; page < 10; page++) {
      const params = new URLSearchParams({ market, limit: '1000' });
      if (oldestSeen) params.set('end', String(oldestSeen - 1));
      const trades = await bitvavoGet<BitvavoTrade[]>(
        credentials.api_key,
        credentials.api_secret,
        `/v2/trades?${params.toString()}`,
      );
      if (trades.length === 0) break;

      for (const t of trades) {
        total++;
        if (existingIds.has(t.id)) { skipped++; continue; }
        const qty = Number(t.amount);
        const price = Number(t.price);
        const fee = Number(t.fee ?? 0);
        if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price)) {
          skipped++; continue;
        }
        const totalValue = qty * price + (t.feeCurrency === 'EUR' ? fee : 0);

        const { error } = await supabase.from('transactions').insert({
          user_id: userId,
          asset_id: symbolToAssetId.get(symbol) ?? null,
          type: t.side, // 'buy' | 'sell' — matches our schema
          symbol,
          quantity: qty,
          price_per_unit: price,
          total_value: totalValue,
          currency: 'EUR',
          fees: t.feeCurrency === 'EUR' ? fee : 0,
          transaction_date: new Date(t.timestamp).toISOString(),
          tax_lot_id: t.id,
          notes: `bitvavo:${t.id}`,
        });
        if (error) { skipped++; continue; }
        existingIds.add(t.id);
        inserted++;
      }

      oldestSeen = Math.min(...trades.map((t) => t.timestamp));
      if (trades.length < 1000) break;
    }
  }

  return { inserted, skipped, total };
}

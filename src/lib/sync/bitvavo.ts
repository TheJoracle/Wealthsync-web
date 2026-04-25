import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SyncResult } from './trading212';
import { enrichTicker } from '@/lib/asset-metadata';

type BitvavoBalance = { symbol: string; available: string; inOrder: string };
type BitvavoPrice = { market: string; price: string };

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

export async function syncBitvavo(
  supabase: SupabaseClient,
  userId: string,
  credentials: { api_key: string; api_secret: string },
): Promise<SyncResult> {
  if (!credentials.api_secret) throw new Error('Bitvavo needs both api_key and api_secret');

  // Get balances (non-EUR currencies are the crypto holdings)
  const balances = await bitvavoGet<BitvavoBalance[]>(
    credentials.api_key,
    credentials.api_secret,
    '/v2/balance',
  );

  // Get EUR prices for all markets in one call
  const prices = await bitvavoGet<BitvavoPrice[]>(
    credentials.api_key,
    credentials.api_secret,
    '/v2/ticker/price',
  );
  const priceBySymbol = new Map<string, number>();
  for (const p of prices) {
    const [base, quote] = p.market.split('-');
    if (quote === 'EUR') priceBySymbol.set(base, Number(p.price));
  }

  let upserted = 0;
  let skipped = 0;
  let total = 0;
  const now = new Date().toISOString();

  for (const b of balances) {
    if (b.symbol === 'EUR') continue; // skip cash
    const amount = Number(b.available) + Number(b.inOrder);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    total++;

    const price = priceBySymbol.get(b.symbol);
    if (!price) { skipped++; continue; }
    const value = amount * price;

    const { data: existing } = await supabase
      .from('assets')
      .select('id')
      .eq('user_id', userId)
      .eq('symbol', b.symbol)
      .limit(1);

    if (existing && existing.length > 0) {
      const { error } = await supabase
        .from('assets')
        .update({
          amount,
          value,
          source: 'bitvavo',
          last_updated: now,
        })
        .eq('id', existing[0].id);
      if (error) { skipped++; continue; }
    } else {
      const meta = await enrichTicker(supabase, b.symbol);
      const { error } = await supabase.from('assets').insert({
        user_id: userId,
        name: meta.name ?? b.symbol,
        symbol: b.symbol,
        type: meta.type ?? 'Crypto',
        amount,
        value,
        purchase_price: 0,
        sector: meta.sector ?? 'Cryptocurrency',
        geography: meta.geography ?? 'Gedecentraliseerd',
        source: 'bitvavo',
        last_updated: now,
      });
      if (error) { skipped++; continue; }
    }
    upserted++;
  }

  return { upserted, skipped, total };
}

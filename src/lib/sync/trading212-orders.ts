import type { SupabaseClient } from '@supabase/supabase-js';

type T212Order = {
  type: string;
  id: number | string;
  fillId?: number | string;
  parentOrder?: number | string;
  ticker: string;
  orderedQuantity?: number;
  filledQuantity?: number;
  limitPrice?: number;
  stopPrice?: number;
  fillPrice?: number;
  filledValue?: number;
  status: string;
  dateCreated?: string;
  dateExecuted?: string;
  dateModified?: string;
};

export type OrderBackfillResult = {
  inserted: number;
  skipped: number;
  total: number;
  rateLimited?: boolean;
  more?: boolean;
  reasons?: Record<string, number>;
  sample?: unknown;
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Trading 212 caps history endpoints at ~1 request per 5 seconds. We
// pre-emptively wait between pages and stop early on a 429 so the user can
// retry later — dedup on tax_lot_id makes that safe.
const PAGE_DELAY_MS = 6000;
const MAX_PAGES_PER_CALL = 8; // ≈400 orders, well under Vercel hobby's 60s

/**
 * Pull complete equity-order history from Trading 212 and insert each filled
 * order as a `buy` or `sell` transaction. Idempotent: dedupes on the T212
 * fillId (or order id when no fill id) stored in `tax_lot_id`.
 *
 * Trading 212 returns 50 per page sorted newest-first; we paginate via the
 * `cursor` query param up to a hard cap (5000 orders).
 */
export async function backfillTrading212Orders(
  supabase: SupabaseClient,
  userId: string,
  credentials: { api_key: string; api_secret?: string; mode?: 'live' | 'demo' },
): Promise<OrderBackfillResult> {
  const host =
    credentials.mode === 'demo' ? 'demo.trading212.com' : 'live.trading212.com';
  const authHeader = credentials.api_secret
    ? `Basic ${Buffer.from(`${credentials.api_key}:${credentials.api_secret}`).toString('base64')}`
    : credentials.api_key;

  // Map known assets to ids for FK linking
  const { data: assets } = await supabase
    .from('assets')
    .select('id, symbol')
    .eq('user_id', userId);
  const assetIdBySymbol = new Map<string, number>();
  for (const a of assets ?? []) {
    assetIdBySymbol.set(String(a.symbol).toUpperCase(), a.id);
  }

  // Pre-load existing tax_lot_ids for dedup
  const { data: existing } = await supabase
    .from('transactions')
    .select('tax_lot_id')
    .eq('user_id', userId)
    .not('tax_lot_id', 'is', null);
  const seenIds = new Set((existing ?? []).map((e) => e.tax_lot_id));

  let inserted = 0;
  let skipped = 0;
  let total = 0;
  let cursor: string | null = null;
  let rateLimited = false;
  let more = false;
  const reasons: Record<string, number> = {};
  const bump = (k: string) => {
    reasons[k] = (reasons[k] ?? 0) + 1;
    skipped++;
  };
  let sample: unknown = null;

  for (let page = 0; page < MAX_PAGES_PER_CALL; page++) {
    if (page > 0) await sleep(PAGE_DELAY_MS);

    const url = new URL(`https://${host}/api/v0/equity/history/orders`);
    url.searchParams.set('limit', '50');
    if (cursor) url.searchParams.set('cursor', cursor);

    const res = await fetch(url.toString(), {
      headers: { Authorization: authHeader, Accept: 'application/json' },
      cache: 'no-store',
    });
    if (res.status === 429) {
      // Hit T212's rate limit — stop here, mark "more available" so user
      // knows to retry. Dedup keeps it safe.
      rateLimited = true;
      more = true;
      break;
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `T212 orders ${host} returned ${res.status}: ${body.slice(0, 160)}`,
      );
    }
    const data = (await res.json()) as { items?: T212Order[]; nextPagePath?: string | null };
    const items = data.items ?? [];
    if (items.length === 0) break;

    for (const o of items) {
      total++;
      if (sample === null) sample = o;

      // Only the filledQuantity field is the real signal — status strings
      // vary across order types. If the order partially or fully filled
      // we want it; if it didn't fill at all (cancelled/rejected/pending),
      // filledQuantity will be 0 or missing.
      const qty = Number(o.filledQuantity ?? 0);
      if (!Number.isFinite(qty) || qty === 0) {
        bump(`unfilled (${o.status ?? 'no-status'})`);
        continue;
      }

      const externalId = String(o.fillId ?? o.id ?? '').replace(/^(undefined|null)$/, '');
      if (!externalId) {
        bump('no-id');
        continue;
      }
      if (seenIds.has(externalId)) {
        bump('duplicate');
        continue;
      }

      const symbol = (o.ticker ?? '').split('_')[0].toUpperCase();
      if (!symbol) {
        bump('no-ticker');
        continue;
      }

      const side = qty < 0 ? 'sell' : 'buy';
      const absQty = Math.abs(qty);
      const price = Number(o.fillPrice ?? o.limitPrice ?? 0);
      const total_value = Number(o.filledValue ?? absQty * price);
      const date = o.dateExecuted ?? o.dateModified ?? o.dateCreated;
      if (!date) {
        bump('no-date');
        continue;
      }

      const { error } = await supabase.from('transactions').insert({
        user_id: userId,
        asset_id: assetIdBySymbol.get(symbol) ?? null,
        type: side,
        symbol,
        quantity: absQty,
        price_per_unit: price || null,
        total_value: Math.abs(total_value),
        currency: 'EUR',
        fees: 0,
        transaction_date: new Date(date).toISOString(),
        tax_lot_id: externalId,
        notes: `t212-backfill:${o.type ?? 'order'}`,
      });
      if (error) {
        bump(`insert-error: ${error.message.slice(0, 60)}`);
        continue;
      }
      seenIds.add(externalId);
      inserted++;
    }

    if (!data.nextPagePath) break;
    try {
      const next = new URL(data.nextPagePath, `https://${host}`);
      cursor = next.searchParams.get('cursor');
      if (!cursor) break;
    } catch {
      break;
    }
    // If we hit our per-call page cap and there are more pages, signal it
    if (page === MAX_PAGES_PER_CALL - 1) more = true;
  }

  return { inserted, skipped, total, rateLimited, more, reasons, sample };
}

import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchPriceForAsset } from '@/lib/prices';

// Must run on Node (admin client uses service_role key)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Asset = {
  id: number;
  user_id: string;
  symbol: string;
  type: string;
  amount: number;
};

export async function GET(request: NextRequest) {
  // Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` when CRON_SECRET is set.
  // In dev (no secret) we allow all requests so you can hit the endpoint manually.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const supabase = createAdminClient();
  const start = Date.now();

  const { data: assets, error: assetsError } = await supabase
    .from('assets')
    .select('id, user_id, symbol, type, amount')
    .returns<Asset[]>();

  if (assetsError) {
    return NextResponse.json({ error: assetsError.message }, { status: 500 });
  }

  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Sequential to stay under API rate limits. ~60 assets should finish well
  // within the 60s Vercel Hobby function limit.
  for (const asset of assets ?? []) {
    const pricePerUnit = await fetchPriceForAsset(asset);
    if (pricePerUnit === null) {
      skipped++;
      continue;
    }

    const newValue = pricePerUnit * Number(asset.amount);
    const nowIso = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('assets')
      .update({ value: newValue, last_updated: nowIso })
      .eq('id', asset.id);

    if (updateError) {
      errors.push(`${asset.symbol}: ${updateError.message}`);
      continue;
    }

    await supabase.from('asset_price_history').insert({
      user_id: asset.user_id,
      asset_id: asset.id,
      symbol: asset.symbol,
      price: pricePerUnit,
      date: nowIso,
    });

    updated++;
  }

  // Write per-user portfolio_history snapshot for today
  await writePortfolioHistory(supabase);

  return NextResponse.json({
    ok: true,
    updated,
    skipped,
    errors,
    durationMs: Date.now() - start,
  });
}

async function writePortfolioHistory(
  supabase: ReturnType<typeof createAdminClient>,
) {
  const { data: assets } = await supabase
    .from('assets')
    .select('user_id, type, value')
    .returns<{ user_id: string; type: string; value: number }[]>();

  if (!assets) return;

  const today = new Date().toISOString().slice(0, 10);
  const byUser = new Map<
    string,
    { etf: number; crypto: number; commodity: number; stock: number }
  >();

  for (const a of assets) {
    if (!byUser.has(a.user_id)) {
      byUser.set(a.user_id, { etf: 0, crypto: 0, commodity: 0, stock: 0 });
    }
    const bucket = byUser.get(a.user_id)!;
    const type = a.type.toLowerCase();
    if (type === 'etf') bucket.etf += Number(a.value);
    else if (type === 'crypto') bucket.crypto += Number(a.value);
    else if (type === 'commodity' || type === 'physical metal') bucket.commodity += Number(a.value);
    else bucket.stock += Number(a.value);
  }

  for (const [userId, b] of byUser) {
    const total = b.etf + b.crypto + b.commodity + b.stock;
    await supabase.from('portfolio_history').upsert(
      {
        user_id: userId,
        date: today,
        total_value: total,
        etf_value: b.etf,
        crypto_value: b.crypto,
        commodity_value: b.commodity,
        stock_value: b.stock,
      },
      { onConflict: 'user_id,date' },
    );
  }
}

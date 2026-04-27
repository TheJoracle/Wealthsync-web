import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/encryption';
import { backfillTrading212Orders } from '@/lib/sync/trading212-orders';
import { computeFifoRealized, type Transaction } from '@/lib/fifo';

export const runtime = 'nodejs';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params;
  if (platform !== 'trading212') {
    return NextResponse.json(
      { error: 'Backfill is alleen beschikbaar voor Trading 212 (gebruik CSV-import voor andere brokers)' },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: connection } = await supabase
    .from('api_connections')
    .select('credentials_encrypted')
    .eq('platform', platform)
    .single();
  if (!connection) {
    return NextResponse.json({ error: 'Trading 212 niet gekoppeld' }, { status: 404 });
  }

  let credentials: { api_key: string; api_secret: string; mode?: 'live' | 'demo' };
  try {
    credentials = JSON.parse(decrypt(connection.credentials_encrypted));
  } catch {
    return NextResponse.json({ error: 'Kon credentials niet decoderen' }, { status: 500 });
  }

  const admin = createAdminClient();
  const startedAt = Date.now();

  try {
    const result = await backfillTrading212Orders(admin, user.id, credentials);

    // After backfill, recompute cost basis from full transaction history.
    const { data: txs } = await admin
      .from('transactions')
      .select('id, type, symbol, quantity, price_per_unit, total_value, fees, transaction_date')
      .eq('user_id', user.id);
    if (txs && txs.length > 0) {
      const fifoInput: Transaction[] = txs.map((t) => ({
        id: t.id,
        type: t.type,
        symbol: t.symbol,
        quantity: t.quantity === null ? null : Number(t.quantity),
        price_per_unit: t.price_per_unit === null ? null : Number(t.price_per_unit),
        total_value: Number(t.total_value),
        fees: t.fees === null ? null : Number(t.fees),
        transaction_date: t.transaction_date,
      }));
      const { openPositions } = computeFifoRealized(fifoInput);
      for (const pos of openPositions) {
        await admin
          .from('assets')
          .update({ purchase_price: pos.costBasis })
          .eq('user_id', user.id)
          .eq('symbol', pos.symbol);
      }
    }

    return NextResponse.json({
      ok: true,
      ...result,
      durationMs: Date.now() - startedAt,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

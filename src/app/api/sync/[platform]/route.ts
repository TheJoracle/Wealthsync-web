import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/encryption';
import { syncTrading212 } from '@/lib/sync/trading212';
import { syncTrading212Dividends } from '@/lib/sync/trading212-dividends';
import { syncBitvavo } from '@/lib/sync/bitvavo';
import { PLATFORMS, type Platform } from '@/app/connections/types';

export const runtime = 'nodejs';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params;
  if (!PLATFORMS.includes(platform as Platform)) {
    return NextResponse.json({ error: 'Unknown platform' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Read the encrypted blob via the user's RLS-scoped client
  const { data: connection } = await supabase
    .from('api_connections')
    .select('credentials_encrypted')
    .eq('platform', platform)
    .single();

  if (!connection) {
    return NextResponse.json({ error: 'Platform not connected' }, { status: 404 });
  }

  let credentials: { api_key: string; api_secret: string; mode?: 'live' | 'demo' };
  try {
    credentials = JSON.parse(decrypt(connection.credentials_encrypted));
  } catch {
    return NextResponse.json({ error: 'Could not decrypt credentials' }, { status: 500 });
  }

  // Sync runs under service_role so we can touch assets regardless of per-row
  // issues, though conceptually we only touch this user's rows.
  const admin = createAdminClient();
  const startedAt = Date.now();

  try {
    const result =
      platform === 'trading212'
        ? await syncTrading212(admin, user.id, credentials)
        : await syncBitvavo(admin, user.id, credentials);

    // Trading 212 dividends are best-effort — don't fail the position sync if
    // the dividends endpoint chokes (e.g. user didn't enable that scope).
    let dividends: { inserted?: number; skipped?: number; total?: number; error?: string } = {};
    if (platform === 'trading212') {
      try {
        const d = await syncTrading212Dividends(admin, user.id, credentials);
        dividends = d;
      } catch (e) {
        dividends = { error: e instanceof Error ? e.message : String(e) };
      }
    }

    await supabase
      .from('api_connections')
      .update({
        last_sync: new Date().toISOString(),
        last_sync_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('platform', platform);

    return NextResponse.json({
      ok: true,
      ...result,
      dividends,
      durationMs: Date.now() - startedAt,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await supabase
      .from('api_connections')
      .update({
        last_sync_error: message.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq('platform', platform);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

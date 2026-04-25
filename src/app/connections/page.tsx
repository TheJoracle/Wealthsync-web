import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppHeader } from '@/components/app-header';
import { ConnectionCard } from '@/components/connection-card';
import { PLATFORMS, type Platform } from '@/app/connections/types';

export const metadata = { title: 'Connections — WealthSync' };

type Connection = {
  platform: Platform;
  is_connected: boolean;
  last_sync: string | null;
  last_sync_error: string | null;
};

export default async function ConnectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: connections } = await supabase
    .from('api_connections')
    .select('platform, is_connected, last_sync, last_sync_error')
    .returns<Connection[]>();

  const byPlatform = new Map<Platform, Connection>();
  for (const c of connections ?? []) byPlatform.set(c.platform, c);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader userEmail={user.email} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Broker-connecties</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Koppel je brokers zodat we automatisch je portfolio synchroniseren.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {PLATFORMS.map((platform) => {
            const c = byPlatform.get(platform);
            return (
              <ConnectionCard
                key={platform}
                platform={platform}
                connected={!!c?.is_connected}
                lastSync={c?.last_sync ?? null}
                lastError={c?.last_sync_error ?? null}
              />
            );
          })}
        </div>
      </main>
    </div>
  );
}

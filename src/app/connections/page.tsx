import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ThemeToggle } from '@/components/theme-toggle';
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
      <header className="border-b border-[var(--border)] px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link
            href="/dashboard"
            className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] bg-clip-text text-2xl font-black text-transparent"
          >
            WealthSync
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Broker-connecties</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Koppel je brokers zodat we automatisch je portfolio synchroniseren.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)]"
          >
            ← Dashboard
          </Link>
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

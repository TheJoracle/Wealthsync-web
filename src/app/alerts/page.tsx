import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ThemeToggle } from '@/components/theme-toggle';
import { AlertsManager } from '@/components/alerts-manager';

export const metadata = { title: 'Alerts — WealthSync' };

export default async function AlertsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: assets }, { data: alerts }] = await Promise.all([
    supabase
      .from('assets')
      .select('id, symbol, name, value, amount')
      .order('symbol'),
    supabase
      .from('price_alerts')
      .select('id, asset_id, symbol, target_price, condition, is_active, created_at')
      .order('created_at', { ascending: false }),
  ]);

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
            <h1 className="text-3xl font-bold">Price alerts</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Stel een alert in als een asset boven of onder een prijs komt.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)]"
          >
            ← Dashboard
          </Link>
        </div>

        <AlertsManager
          assets={(assets ?? []).map((a) => ({
            id: a.id,
            symbol: a.symbol,
            name: a.name,
            value: Number(a.value),
            amount: Number(a.amount),
          }))}
          alerts={(alerts ?? []).map((a) => ({
            id: a.id,
            asset_id: a.asset_id,
            symbol: a.symbol,
            target_price: Number(a.target_price),
            condition: a.condition,
            is_active: a.is_active,
            created_at: a.created_at,
          }))}
        />
      </main>
    </div>
  );
}

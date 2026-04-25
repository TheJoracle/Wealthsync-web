import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppHeader } from '@/components/app-header';
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
      <AppHeader userEmail={user.email} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Price alerts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Stel een alert in als een asset boven of onder een prijs komt.
          </p>
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

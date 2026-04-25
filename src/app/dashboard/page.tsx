import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus, Pencil } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AppHeader } from '@/components/app-header';
import { DeleteAssetButton } from '@/components/delete-asset-button';
import { PortfolioHistoryChart } from '@/components/portfolio-history-chart';
import { AllocationChart } from '@/components/allocation-chart';
import { MetricsCards } from '@/components/metrics-cards';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const metadata = {
  title: 'Dashboard — WealthSync',
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [
    { data: assets },
    { data: history },
    { data: benchmarks },
    { data: benchmarkHistory },
    { data: cashflowTxs },
    { data: divs },
  ] = await Promise.all([
    supabase
      .from('assets')
      .select('id, name, symbol, type, amount, value, purchase_price')
      .order('value', { ascending: false }),
    supabase
      .from('portfolio_history')
      .select('date, total_value')
      .order('date', { ascending: true }),
    supabase
      .from('benchmarks')
      .select('id, name, symbol')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('benchmark_history')
      .select('symbol, date, price')
      .order('date', { ascending: true }),
    supabase
      .from('transactions')
      .select('type, total_value, transaction_date')
      .in('type', ['deposit', 'withdrawal']),
    supabase.from('dividend_payments').select('total_amount, withholding_tax_amount, net_amount'),
  ]);

  const totalValue = (assets ?? []).reduce((sum, a) => sum + Number(a.value), 0);
  const totalInvested = (assets ?? []).reduce(
    (sum, a) => sum + Number(a.purchase_price ?? 0),
    0,
  );
  const historyPoints = (history ?? []).map((h) => ({
    date: h.date,
    total_value: Number(h.total_value),
  }));
  const allocationRows = (assets ?? []).map((a) => ({
    type: a.type,
    value: Number(a.value),
  }));

  const benchmarkSeries = (benchmarks ?? []).map((b) => ({
    symbol: b.symbol,
    name: b.name,
    points: (benchmarkHistory ?? [])
      .filter((bh) => bh.symbol === b.symbol)
      .map((bh) => ({ date: bh.date, price: Number(bh.price) })),
  }));

  const cashflowsByDate: Record<string, number> = {};
  for (const t of cashflowTxs ?? []) {
    const date = String(t.transaction_date).slice(0, 10);
    const sign = t.type === 'deposit' ? 1 : -1;
    cashflowsByDate[date] = (cashflowsByDate[date] ?? 0) + sign * Number(t.total_value);
  }

  const totalDividends = (divs ?? []).reduce(
    (s, d) =>
      s +
      Number(
        d.net_amount ?? Number(d.total_amount) - Number(d.withholding_tax_amount ?? 0),
      ),
    0,
  );

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader userEmail={user.email} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <Card>
          <CardHeader>
            <CardDescription>Totale portfolio-waarde</CardDescription>
            <CardTitle className="text-5xl font-bold tabular-nums">
              €{totalValue.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>

        <section className="mt-6">
          <MetricsCards
            history={historyPoints}
            currentValue={totalValue}
            totalInvested={totalInvested}
            cashflowsByDate={cashflowsByDate}
            totalDividends={totalDividends}
          />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <PortfolioHistoryChart data={historyPoints} benchmarks={benchmarkSeries} />
          <AllocationChart data={allocationRows} />
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Assets</h2>
            <Link href="/assets/new" className={buttonVariants({ size: 'lg' })}>
              <Plus />
              Nieuw asset
            </Link>
          </div>
          {!assets || assets.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground">
                  Nog geen assets. Klik op <strong>Nieuw asset</strong> om er een toe te voegen.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {assets.map((asset) => {
                const value = Number(asset.value);
                const cost = Number(asset.purchase_price ?? 0);
                const pnl = cost > 0 ? value - cost : null;
                const pct = cost > 0 ? ((value - cost) / cost) * 100 : null;
                const positive = pnl !== null && pnl >= 0;
                return (
                  <Card key={asset.id}>
                    <CardContent className="flex items-center justify-between gap-3 px-6 py-4">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{asset.name}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {asset.symbol} · {asset.type} · {Number(asset.amount).toLocaleString('nl-NL')}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-4">
                        <div className="text-right tabular-nums">
                          <p className="text-lg font-semibold">
                            €{value.toLocaleString('nl-NL', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                          {pct !== null && (
                            <p
                              className={`text-xs font-medium ${
                                positive ? 'text-primary' : 'text-destructive'
                              }`}
                            >
                              {positive ? '+' : ''}€{pnl!.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}{' '}
                              ({positive ? '+' : ''}{pct.toFixed(1)}%)
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Link
                            href={`/assets/${asset.id}/edit`}
                            className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
                            title="Bewerk"
                          >
                            <Pencil />
                          </Link>
                          <DeleteAssetButton id={asset.id} name={asset.name} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

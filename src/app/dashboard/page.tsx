import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ThemeToggle } from '@/components/theme-toggle';
import { DeleteAssetButton } from '@/components/delete-asset-button';
import { PortfolioHistoryChart } from '@/components/portfolio-history-chart';
import { AllocationChart } from '@/components/allocation-chart';
import { MetricsCards } from '@/components/metrics-cards';

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

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-[var(--border)] px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] bg-clip-text text-2xl font-black text-transparent">
            WealthSync
          </h1>
          <div className="flex items-center gap-3">
            <Link
              href="/connections"
              className="text-sm text-[var(--text-secondary)] transition hover:text-[var(--accent)]"
            >
              Connections
            </Link>
            <span className="text-sm text-[var(--text-secondary)]">{user.email}</span>
            <ThemeToggle />
            <form action="/logout" method="post">
              <button
                type="submit"
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:border-[var(--danger)] hover:text-[var(--danger)]"
              >
                Uitloggen
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8">
          <p className="text-sm text-[var(--text-secondary)]">Totale portfolio-waarde</p>
          <p className="mt-2 text-5xl font-bold">
            €{totalValue.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </section>

        <section className="mt-6">
          <MetricsCards
            history={historyPoints}
            currentValue={totalValue}
            totalInvested={totalInvested}
          />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <PortfolioHistoryChart data={historyPoints} benchmarks={benchmarkSeries} />
          <AllocationChart data={allocationRows} />
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Assets</h2>
            <Link
              href="/assets/new"
              className="rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)] transition hover:brightness-110"
            >
              + Nieuw asset
            </Link>
          </div>
          {!assets || assets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-card)] p-8 text-center">
              <p className="text-[var(--text-secondary)]">
                Nog geen assets. Klik op <strong>Nieuw asset</strong> om er een toe te voegen.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {assets.map((asset) => {
                const value = Number(asset.value);
                const cost = Number(asset.purchase_price ?? 0);
                const pnl = cost > 0 ? value - cost : null;
                const pct = cost > 0 ? ((value - cost) / cost) * 100 : null;
                const positive = pnl !== null && pnl >= 0;
                return (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-6 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{asset.name}</p>
                      <p className="truncate text-sm text-[var(--text-secondary)]">
                        {asset.symbol} · {asset.type} · {Number(asset.amount).toLocaleString('nl-NL')}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-semibold">
                          €{value.toLocaleString('nl-NL', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                        {pct !== null && (
                          <p
                            className={`text-xs font-medium ${
                              positive ? 'text-[var(--accent)]' : 'text-[var(--danger)]'
                            }`}
                          >
                            {positive ? '+' : ''}€{pnl!.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}{' '}
                            ({positive ? '+' : ''}{pct.toFixed(1)}%)
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/assets/${asset.id}/edit`}
                          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                        >
                          Bewerk
                        </Link>
                        <DeleteAssetButton id={asset.id} name={asset.name} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

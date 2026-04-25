import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ThemeToggle } from '@/components/theme-toggle';
import { TypeGrowthChart, type TypeHistoryPoint } from '@/components/type-growth-chart';
import { BreakdownChart } from '@/components/breakdown-chart';
import { ConcentrationCard } from '@/components/concentration-card';
import { RebalanceTool } from '@/components/rebalance-tool';

export const metadata = { title: 'Charts — WealthSync' };

type AssetSlice = {
  symbol: string;
  type: string;
  value: number;
  sector: string | null;
  geography: string | null;
};

export default async function ChartsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: assets }, { data: history }] = await Promise.all([
    supabase
      .from('assets')
      .select('symbol, type, value, sector, geography')
      .order('value', { ascending: false })
      .returns<AssetSlice[]>(),
    supabase
      .from('portfolio_history')
      .select('date, etf_value, crypto_value, commodity_value, stock_value')
      .order('date', { ascending: true })
      .returns<TypeHistoryPoint[]>(),
  ]);

  const breakdownInput = (assets ?? []).map((a) => ({
    label: a.symbol,
    value: Number(a.value),
  }));

  const sectorRows = (assets ?? []).map((a) => ({
    label: a.symbol,
    value: Number(a.value),
    category: a.sector,
  }));

  const geoRows = (assets ?? []).map((a) => ({
    label: a.symbol,
    value: Number(a.value),
    category: a.geography,
  }));

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

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Charts & spreiding</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Diepere analyse: groei per asset-type, sector- en geografische spreiding, concentratie-rating.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)]"
          >
            ← Dashboard
          </Link>
        </div>

        <div className="flex flex-col gap-6">
          <TypeGrowthChart data={history ?? []} />

          <ConcentrationCard
            values={breakdownInput.map((r) => r.value)}
            topSymbol={breakdownInput[0]?.label ?? ''}
          />

          <RebalanceTool
            assets={(assets ?? []).map((a) => ({
              symbol: a.symbol,
              type: a.type,
              value: Number(a.value),
            }))}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <BreakdownChart
              title="Verdeling per sector"
              emptyHint="Geen sector-info bij je assets. Vul handmatig in via Bewerk per asset, of we kunnen later automatische verrijking via een ticker-database toevoegen."
              data={sectorRows}
            />
            <BreakdownChart
              title="Verdeling per geografie"
              emptyHint="Geen geografie-info bij je assets. Vul handmatig in via Bewerk per asset."
              data={geoRows}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

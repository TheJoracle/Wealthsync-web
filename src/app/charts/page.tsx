import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppHeader } from '@/components/app-header';
import { TypeGrowthChart, type TypeHistoryPoint } from '@/components/type-growth-chart';
import { BreakdownChart } from '@/components/breakdown-chart';
import { ConcentrationCard } from '@/components/concentration-card';
import { CorrelationCard } from '@/components/correlation-card';
import { RebalanceTool } from '@/components/rebalance-tool';
import { computePairwiseCorrelations, type Series } from '@/lib/correlation';

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

  const [
    { data: assets },
    { data: history },
    { data: priceHistory },
  ] = await Promise.all([
    supabase
      .from('assets')
      .select('id, symbol, name, type, value, sector, geography')
      .order('value', { ascending: false })
      .returns<(AssetSlice & { id: number; name: string })[]>(),
    supabase
      .from('portfolio_history')
      .select('date, etf_value, crypto_value, commodity_value, stock_value')
      .order('date', { ascending: true })
      .returns<TypeHistoryPoint[]>(),
    supabase
      .from('asset_price_history')
      .select('asset_id, date, price')
      .order('date', { ascending: true }),
  ]);

  // Build per-asset price series for correlation
  const seriesByAssetId = new Map<number, { date: string; price: number }[]>();
  for (const row of priceHistory ?? []) {
    const aid = Number(row.asset_id);
    if (!seriesByAssetId.has(aid)) seriesByAssetId.set(aid, []);
    seriesByAssetId.get(aid)!.push({
      date: String(row.date).slice(0, 10),
      price: Number(row.price),
    });
  }
  const correlationSeries: Series[] = (assets ?? [])
    .map((a) => ({
      symbol: a.symbol,
      name: a.name,
      points: seriesByAssetId.get(a.id) ?? [],
    }))
    .filter((s) => s.points.length >= 5);
  const correlationPairs = computePairwiseCorrelations(correlationSeries);
  const correlationSymbols = correlationSeries.map((s) => s.symbol);

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
      <AppHeader userEmail={user.email} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Charts & spreiding</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Diepere analyse: groei per asset-type, sector- en geografische spreiding, concentratie-rating.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <TypeGrowthChart data={history ?? []} />

          <ConcentrationCard
            values={breakdownInput.map((r) => r.value)}
            topSymbol={breakdownInput[0]?.label ?? ''}
          />

          <CorrelationCard pairs={correlationPairs} symbols={correlationSymbols} />

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

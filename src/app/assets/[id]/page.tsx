import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Pencil } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AppHeader } from '@/components/app-header';
import { AssetPriceChart, type PricePoint } from '@/components/asset-price-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';

export const metadata = { title: 'Asset — WealthSync' };

function fmtEur(n: number, frac = 2): string {
  return `€${n.toLocaleString('nl-NL', { minimumFractionDigits: frac, maximumFractionDigits: frac })}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [
    { data: asset },
    { data: prices },
    { data: dividends },
    { data: transactions },
  ] = await Promise.all([
    supabase
      .from('assets')
      .select('id, name, symbol, type, amount, value, purchase_price, sector, geography, source, last_updated, notes')
      .eq('id', id)
      .single(),
    supabase
      .from('asset_price_history')
      .select('price, date')
      .eq('asset_id', id)
      .order('date', { ascending: true }),
    supabase
      .from('dividend_payments')
      .select('id, payment_date, amount_per_share, total_amount, withholding_tax_amount, currency')
      .eq('asset_id', id)
      .order('payment_date', { ascending: false }),
    supabase
      .from('transactions')
      .select('id, type, quantity, price_per_unit, total_value, fees, transaction_date, notes')
      .eq('asset_id', id)
      .order('transaction_date', { ascending: false })
      .limit(50),
  ]);

  if (!asset) notFound();

  const value = Number(asset.value);
  const cost = Number(asset.purchase_price ?? 0);
  const pnl = cost > 0 ? value - cost : null;
  const pct = cost > 0 ? ((value - cost) / cost) * 100 : null;
  const positive = pnl !== null && pnl >= 0;
  const amount = Number(asset.amount);
  const avgPrice = amount > 0 ? value / amount : 0;

  const pricePoints: PricePoint[] = (prices ?? []).map((p) => ({
    date: String(p.date).slice(0, 10),
    price: Number(p.price),
  }));

  const dividendTotal = (dividends ?? []).reduce(
    (s, d) => s + Number(d.total_amount),
    0,
  );
  const yieldOnCost = cost > 0 ? (dividendTotal / cost) * 100 : null;
  const totalReturn = pnl !== null ? pnl + dividendTotal : null;
  const totalReturnPct = cost > 0 ? ((value - cost + dividendTotal) / cost) * 100 : null;

  // Transaction summary
  const buyTotal = (transactions ?? [])
    .filter((t) => t.type === 'buy')
    .reduce((s, t) => s + Number(t.total_value), 0);
  const sellTotal = (transactions ?? [])
    .filter((t) => t.type === 'sell')
    .reduce((s, t) => s + Number(t.total_value), 0);
  const txDates = (transactions ?? []).map((t) => new Date(t.transaction_date).getTime());
  const firstActivity = txDates.length > 0 ? new Date(Math.min(...txDates)) : null;
  const lastActivity = txDates.length > 0 ? new Date(Math.max(...txDates)) : null;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader userEmail={user.email} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Terug naar dashboard
        </Link>

        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">{asset.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 font-mono text-xs">
                {asset.symbol}
              </span>
              <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs">
                {asset.type}
              </span>
              {asset.sector && (
                <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs">
                  {asset.sector}
                </span>
              )}
              {asset.geography && (
                <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs">
                  {asset.geography}
                </span>
              )}
            </div>
          </div>
          <Link
            href={`/assets/${asset.id}/edit`}
            className={buttonVariants({ variant: 'outline', size: 'lg' })}
          >
            <Pencil className="size-4" />
            Bewerk
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="px-6 py-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Huidige waarde</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{fmtEur(value)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="px-6 py-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Aantal</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {amount.toLocaleString('nl-NL', { maximumFractionDigits: 4 })}
              </p>
              {avgPrice > 0 && (
                <p className="text-xs text-muted-foreground">≈ {fmtEur(avgPrice)} per stuk</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="px-6 py-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Aankoopprijs</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {cost > 0 ? fmtEur(cost) : '—'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="px-6 py-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">P&amp;L</p>
              <p
                className={`mt-1 text-2xl font-bold tabular-nums ${
                  pnl === null ? '' : positive ? 'text-primary' : 'text-destructive'
                }`}
              >
                {pnl === null
                  ? '—'
                  : `${positive ? '+' : ''}${fmtEur(pnl)}`}
              </p>
              {pct !== null && (
                <p
                  className={`text-xs font-medium ${
                    positive ? 'text-primary' : 'text-destructive'
                  }`}
                >
                  {positive ? '+' : ''}{pct.toFixed(1)}%
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {(yieldOnCost !== null || totalReturnPct !== null || transactions?.length) && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {totalReturnPct !== null && (
              <Card>
                <CardContent className="px-6 py-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Total return (incl. dividend)
                  </p>
                  <p
                    className={`mt-1 text-2xl font-bold tabular-nums ${
                      (totalReturn ?? 0) >= 0 ? 'text-primary' : 'text-destructive'
                    }`}
                  >
                    {(totalReturn ?? 0) >= 0 ? '+' : ''}
                    {fmtEur(totalReturn ?? 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(totalReturnPct ?? 0) >= 0 ? '+' : ''}
                    {(totalReturnPct ?? 0).toFixed(1)}%
                  </p>
                </CardContent>
              </Card>
            )}
            {yieldOnCost !== null && yieldOnCost > 0 && (
              <Card>
                <CardContent className="px-6 py-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Yield on cost
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {yieldOnCost.toFixed(2)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fmtEur(dividendTotal)} dividend
                  </p>
                </CardContent>
              </Card>
            )}
            {firstActivity && (
              <Card>
                <CardContent className="px-6 py-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Eerste activiteit
                  </p>
                  <p className="mt-1 text-base font-semibold">
                    {fmtDate(firstActivity.toISOString())}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {transactions?.length} transactie{transactions?.length === 1 ? '' : 's'}
                  </p>
                </CardContent>
              </Card>
            )}
            {lastActivity && lastActivity.getTime() !== firstActivity?.getTime() && (
              <Card>
                <CardContent className="px-6 py-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Laatste activiteit
                  </p>
                  <p className="mt-1 text-base font-semibold">
                    {fmtDate(lastActivity.toISOString())}
                  </p>
                  {buyTotal > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Gekocht: {fmtEur(buyTotal)}
                      {sellTotal > 0 ? ` · Verkocht: ${fmtEur(sellTotal)}` : ''}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <section className="mt-6">
          <AssetPriceChart data={pricePoints} symbol={asset.symbol} />
        </section>

        <section className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Transacties</CardTitle>
              <p className="text-sm text-muted-foreground">
                Alle aan- en verkopen voor dit asset (max 50 meest recente).
              </p>
            </CardHeader>
            <CardContent className="px-0">
              {!transactions || transactions.length === 0 ? (
                <p className="px-6 py-4 text-center text-sm text-muted-foreground">
                  Geen transacties geregistreerd voor dit asset.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide">
                        Datum
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide">
                        Type
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide">
                        Aantal
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide">
                        Prijs
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide">
                        Totaal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => {
                      const typeColor =
                        tx.type === 'sell' || tx.type === 'withdrawal'
                          ? 'text-destructive'
                          : tx.type === 'buy' || tx.type === 'deposit'
                            ? 'text-primary'
                            : 'text-muted-foreground';
                      return (
                        <tr key={tx.id} className="border-t border-border">
                          <td className="px-4 py-2 tabular-nums">{fmtDate(tx.transaction_date)}</td>
                          <td className={`px-4 py-2 font-medium capitalize ${typeColor}`}>
                            {tx.type}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {tx.quantity !== null
                              ? Number(tx.quantity).toLocaleString('nl-NL', { maximumFractionDigits: 4 })
                              : '—'}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {tx.price_per_unit !== null
                              ? fmtEur(Number(tx.price_per_unit))
                              : '—'}
                          </td>
                          <td className="px-4 py-2 text-right font-semibold tabular-nums">
                            {fmtEur(Number(tx.total_value))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Dividend-historie</CardTitle>
              <p className="text-sm text-muted-foreground">
                Totaal ontvangen: {fmtEur(dividendTotal)} ({dividends?.length ?? 0} betaling
                {dividends?.length === 1 ? '' : 'en'})
              </p>
            </CardHeader>
            <CardContent className="px-0">
              {!dividends || dividends.length === 0 ? (
                <p className="px-6 py-4 text-center text-sm text-muted-foreground">
                  Geen dividend-betalingen voor dit asset.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide">
                        Datum
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide">
                        Per aandeel
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide">
                        Bruto
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide">
                        Bronbel.
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dividends.map((d) => (
                      <tr key={d.id} className="border-t border-border">
                        <td className="px-4 py-2 tabular-nums">{fmtDate(d.payment_date)}</td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {fmtEur(Number(d.amount_per_share), 4)}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {fmtEur(Number(d.total_amount))}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {Number(d.withholding_tax_amount ?? 0) > 0
                            ? fmtEur(Number(d.withholding_tax_amount ?? 0))
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="flex flex-col gap-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Bron</dt>
                  <dd className="font-medium">{asset.source ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Laatst bijgewerkt</dt>
                  <dd className="font-medium">
                    {asset.last_updated ? fmtDate(asset.last_updated) : '—'}
                  </dd>
                </div>
                {asset.notes && (
                  <div>
                    <dt className="text-muted-foreground">Notities</dt>
                    <dd className="mt-1 whitespace-pre-line text-sm">{asset.notes}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

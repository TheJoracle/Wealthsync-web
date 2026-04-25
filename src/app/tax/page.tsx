import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppHeader } from '@/components/app-header';
import { Box3Calculator } from '@/components/box3-calculator';
import { Box3Snapshots, type Box3Snapshot } from '@/components/box3-snapshots';
import {
  DividendTaxSummary,
  type DividendTaxRow,
} from '@/components/dividend-tax-summary';

export const metadata = { title: 'Belasting — WealthSync' };

export default async function TaxPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [
    { data: assets },
    { data: snapshots },
    { data: dividends },
  ] = await Promise.all([
    supabase.from('assets').select('value'),
    supabase
      .from('box3_snapshots')
      .select(
        'snapshot_date, year, total_wealth, taxable_wealth, estimated_tax, tax_free_allowance',
      )
      .order('year', { ascending: false })
      .returns<Box3Snapshot[]>(),
    supabase
      .from('dividend_payments')
      .select(
        'payment_date, symbol, total_amount, withholding_tax_amount, net_amount, source_country',
      )
      .order('payment_date', { ascending: false })
      .returns<DividendTaxRow[]>(),
  ]);

  const portfolioValue = (assets ?? []).reduce(
    (s, a) => s + Number(a.value),
    0,
  );

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader userEmail={user.email} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">🇳🇱 Belasting</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Box 3 berekening, snapshots voor de aangifte, en dividendbelasting-overzicht.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <Box3Calculator initialWealth={portfolioValue} />

          <section>
            <h2 className="mb-3 text-xl font-semibold">Bewaarde snapshots</h2>
            <p className="mb-3 text-sm text-[var(--text-secondary)]">
              Voor de aangifte tel je het vermogen op 1 januari. Bewaar je berekening per jaar zodat je 'm later terug kunt vinden.
            </p>
            <Box3Snapshots snapshots={snapshots ?? []} />
          </section>

          <DividendTaxSummary dividends={dividends ?? []} />
        </div>

        <p className="mt-8 text-xs text-[var(--text-muted)]">
          Disclaimer: cijfers zijn indicatief op basis van de gepubliceerde Box 3-tarieven. Voor je aangifte
          gebruik je de officiële Belastingdienst-tools en eventueel een belastingadviseur.
        </p>
      </main>
    </div>
  );
}

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppHeader } from '@/components/app-header';
import { DividendList } from '@/components/dividend-list';

export const metadata = { title: 'Dividenden — WealthSync' };

type DividendRow = {
  id: number;
  symbol: string;
  amount_per_share: number;
  total_amount: number;
  payment_date: string;
  currency: string;
  dividend_type: string;
  source_country: string | null;
  withholding_tax_rate: number | null;
  withholding_tax_amount: number | null;
  net_amount: number | null;
};

export default async function DividendsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: dividends } = await supabase
    .from('dividend_payments')
    .select(
      'id, symbol, amount_per_share, total_amount, payment_date, currency, dividend_type, source_country, withholding_tax_rate, withholding_tax_amount, net_amount',
    )
    .order('payment_date', { ascending: false })
    .returns<DividendRow[]>();

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader userEmail={user.email} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Dividenden</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ontvangen dividenden, jaartotalen en bronbelasting voor je belastingaangifte.
          </p>
        </div>

        <DividendList dividends={dividends ?? []} />
      </main>
    </div>
  );
}

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ThemeToggle } from '@/components/theme-toggle';
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
            <h1 className="text-3xl font-bold">Dividenden</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Ontvangen dividenden, jaartotalen en bronbelasting voor je belastingaangifte.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)]"
          >
            ← Dashboard
          </Link>
        </div>

        <DividendList dividends={dividends ?? []} />
      </main>
    </div>
  );
}

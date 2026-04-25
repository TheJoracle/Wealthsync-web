import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ThemeToggle } from '@/components/theme-toggle';
import { TransactionsList, type TransactionRow } from '@/components/transactions-list';
import { RealizedGains } from '@/components/realized-gains';
import { computeFifoRealized, type Transaction } from '@/lib/fifo';

export const metadata = { title: 'Transacties — WealthSync' };

export default async function TransactionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: transactions } = await supabase
    .from('transactions')
    .select(
      'id, type, symbol, quantity, price_per_unit, total_value, fees, currency, transaction_date, notes',
    )
    .order('transaction_date', { ascending: false })
    .returns<TransactionRow[]>();

  const fifoInput: Transaction[] = (transactions ?? []).map((t) => ({
    id: t.id,
    type: t.type,
    symbol: t.symbol,
    quantity: t.quantity === null ? null : Number(t.quantity),
    price_per_unit: t.price_per_unit === null ? null : Number(t.price_per_unit),
    total_value: Number(t.total_value),
    fees: t.fees === null ? null : Number(t.fees),
    transaction_date: t.transaction_date,
  }));
  const fifo = computeFifoRealized(fifoInput);

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
            <h1 className="text-3xl font-bold">Transacties</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Volledige historie van aan- en verkopen, dividenden en stortingen.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)]"
            >
              ← Dashboard
            </Link>
            <Link
              href="/transactions/new"
              className="rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)] transition hover:brightness-110"
            >
              + Nieuwe transactie
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <RealizedGains result={fifo} />
          <TransactionsList transactions={transactions ?? []} />
        </div>
      </main>
    </div>
  );
}

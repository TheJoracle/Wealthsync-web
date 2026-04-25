import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TransactionForm } from '@/components/transaction-form';
import { updateTransaction } from '@/app/transactions/actions';

export const metadata = { title: 'Transactie bewerken — WealthSync' };

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: tx }, { data: assets }] = await Promise.all([
    supabase
      .from('transactions')
      .select(
        'id, type, symbol, quantity, price_per_unit, total_value, fees, currency, transaction_date, notes, asset_id',
      )
      .eq('id', id)
      .single(),
    supabase.from('assets').select('id, symbol, name').order('symbol'),
  ]);

  if (!tx) notFound();

  const updateWithId = async (formData: FormData) => {
    'use server';
    return updateTransaction(id, formData);
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-3xl font-bold">Transactie bewerken</h1>
      <TransactionForm
        initial={{
          type: tx.type,
          symbol: tx.symbol ?? '',
          quantity: Number(tx.quantity ?? 0),
          price_per_unit: Number(tx.price_per_unit ?? 0),
          total_value: Number(tx.total_value),
          currency: tx.currency ?? 'EUR',
          fees: Number(tx.fees ?? 0),
          transaction_date: tx.transaction_date,
          notes: tx.notes ?? '',
          asset_id: tx.asset_id,
        }}
        assets={assets ?? []}
        onSubmit={updateWithId}
        submitLabel="Wijzigingen opslaan"
      />
    </div>
  );
}

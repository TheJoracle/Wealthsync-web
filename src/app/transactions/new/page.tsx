import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TransactionForm } from '@/components/transaction-form';
import { addTransaction } from '@/app/transactions/actions';

export const metadata = { title: 'Nieuwe transactie — WealthSync' };

export default async function NewTransactionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: assets } = await supabase
    .from('assets')
    .select('id, symbol, name')
    .order('symbol');

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-3xl font-bold">Nieuwe transactie</h1>
      <TransactionForm
        assets={assets ?? []}
        onSubmit={addTransaction}
        submitLabel="Transactie opslaan"
      />
    </div>
  );
}

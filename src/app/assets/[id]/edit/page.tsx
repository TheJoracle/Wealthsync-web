import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AssetForm } from '@/components/asset-form';
import { updateAsset } from '@/app/assets/actions';

export const metadata = { title: 'Asset bewerken — WealthSync' };

export default async function EditAssetPage({
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

  const { data: asset } = await supabase
    .from('assets')
    .select('id, name, symbol, type, amount, value, purchase_price, notes, sector, geography')
    .eq('id', id)
    .single();

  if (!asset) notFound();

  const updateWithId = async (formData: FormData) => {
    'use server';
    return updateAsset(id, formData);
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-3xl font-bold">Asset bewerken</h1>
      <AssetForm
        initial={{
          name: asset.name,
          symbol: asset.symbol,
          type: asset.type,
          amount: Number(asset.amount),
          value: Number(asset.value),
          purchase_price: Number(asset.purchase_price ?? 0),
          notes: asset.notes ?? '',
          sector: asset.sector ?? '',
          geography: asset.geography ?? '',
        }}
        onSubmit={updateWithId}
        submitLabel="Wijzigingen opslaan"
      />
    </div>
  );
}

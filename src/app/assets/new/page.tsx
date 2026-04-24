import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AssetForm } from '@/components/asset-form';
import { addAsset } from '@/app/assets/actions';

export const metadata = { title: 'Nieuw asset — WealthSync' };

export default async function NewAssetPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-3xl font-bold">Nieuw asset toevoegen</h1>
      <AssetForm onSubmit={addAsset} submitLabel="Asset opslaan" />
    </div>
  );
}

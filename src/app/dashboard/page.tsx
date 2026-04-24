import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ThemeToggle } from '@/components/theme-toggle';
import { DeleteAssetButton } from '@/components/delete-asset-button';

export const metadata = {
  title: 'Dashboard — WealthSync',
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: assets } = await supabase
    .from('assets')
    .select('id, name, symbol, type, amount, value')
    .order('value', { ascending: false });

  const totalValue = (assets ?? []).reduce((sum, a) => sum + Number(a.value), 0);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-[var(--border)] px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] bg-clip-text text-2xl font-black text-transparent">
            WealthSync
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--text-secondary)]">{user.email}</span>
            <ThemeToggle />
            <form action="/logout" method="post">
              <button
                type="submit"
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:border-[var(--danger)] hover:text-[var(--danger)]"
              >
                Uitloggen
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8">
          <p className="text-sm text-[var(--text-secondary)]">Totale portfolio-waarde</p>
          <p className="mt-2 text-5xl font-bold">
            €{totalValue.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Assets</h2>
            <Link
              href="/assets/new"
              className="rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)] transition hover:brightness-110"
            >
              + Nieuw asset
            </Link>
          </div>
          {!assets || assets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-card)] p-8 text-center">
              <p className="text-[var(--text-secondary)]">
                Nog geen assets. Klik op <strong>Nieuw asset</strong> om er een toe te voegen.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-6 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{asset.name}</p>
                    <p className="truncate text-sm text-[var(--text-secondary)]">
                      {asset.symbol} · {asset.type} · {Number(asset.amount).toLocaleString('nl-NL')}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <p className="text-lg font-semibold">
                      €{Number(asset.value).toLocaleString('nl-NL', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    <div className="flex gap-2">
                      <Link
                        href={`/assets/${asset.id}/edit`}
                        className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                      >
                        Bewerk
                      </Link>
                      <DeleteAssetButton id={asset.id} name={asset.name} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

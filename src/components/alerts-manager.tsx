'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addAlert, deleteAlert, toggleAlert } from '@/app/alerts/actions';

type Asset = { id: number; symbol: string; name: string; value: number; amount: number };

type AlertRow = {
  id: number;
  asset_id: number;
  symbol: string;
  target_price: number;
  condition: string;
  is_active: boolean;
  created_at: string;
};

function fmtEur(n: number, frac = 2): string {
  return `€${n.toLocaleString('nl-NL', { minimumFractionDigits: frac, maximumFractionDigits: frac })}`;
}

export function AlertsManager({
  assets,
  alerts,
}: {
  assets: Asset[];
  alerts: AlertRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<number>(assets[0]?.id ?? 0);
  const [target, setTarget] = useState(0);
  const [condition, setCondition] = useState<'above' | 'below'>('above');

  const selectedAsset = assets.find((a) => a.id === assetId);
  const currentPrice = selectedAsset && selectedAsset.amount > 0
    ? selectedAsset.value / selectedAsset.amount
    : 0;

  function onAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const fd = new FormData(event.currentTarget);
    if (selectedAsset) fd.set('symbol', selectedAsset.symbol);
    startTransition(async () => {
      const r = await addAlert(fd);
      if (r?.error) setError(r.error);
      else router.refresh();
    });
  }

  function onDelete(id: number) {
    if (!confirm('Alert verwijderen?')) return;
    startTransition(async () => { await deleteAlert(id); });
  }

  function onToggle(id: number, active: boolean) {
    startTransition(async () => { await toggleAlert(id, active); });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="text-lg font-semibold">Nieuwe alert</h3>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          We checken bij elke price-update of de doelprijs is gepasseerd. Notificaties komen later via email.
        </p>
        <form onSubmit={onAdd} className="mt-4 grid gap-4 sm:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium text-[var(--text-secondary)]">Asset</span>
            <select
              name="asset_id"
              required
              value={assetId}
              onChange={(e) => setAssetId(Number(e.target.value))}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
            >
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.symbol} — {a.name}
                </option>
              ))}
            </select>
            {currentPrice > 0 && (
              <span className="text-xs text-[var(--text-muted)]">
                Huidige prijs ≈ {fmtEur(currentPrice)}
              </span>
            )}
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-[var(--text-secondary)]">Conditie</span>
            <select
              name="condition"
              value={condition}
              onChange={(e) => setCondition(e.target.value as 'above' | 'below')}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
            >
              <option value="above">Boven</option>
              <option value="below">Onder</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-[var(--text-secondary)]">Doelprijs (€)</span>
            <input
              type="number"
              step="any"
              name="target_price"
              required
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
            />
          </label>
          <input type="hidden" name="symbol" value={selectedAsset?.symbol ?? ''} />
          {error && (
            <div className="rounded-lg border border-[var(--danger)] bg-[var(--danger)]/10 px-4 py-2 text-sm text-[var(--danger)] sm:col-span-4">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={pending || assets.length === 0}
            className="rounded-lg bg-gradient-to-r from-[var(--brand)] to-[var(--brand-hover)] px-4 py-2 text-sm font-semibold text-[var(--on-brand)] transition hover:brightness-110 disabled:opacity-50 sm:col-span-4 sm:max-w-xs"
          >
            {pending ? '...' : '+ Alert toevoegen'}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
        <h3 className="border-b border-[var(--border)] px-6 py-4 text-lg font-semibold">
          Actieve alerts ({alerts.filter((a) => a.is_active).length})
        </h3>
        {alerts.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-[var(--text-secondary)]">
            Nog geen alerts. Voeg er hierboven een toe.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-panel)] text-[var(--text-secondary)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Symbool</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Conditie</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Doelprijs</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Actief</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 font-medium">{a.symbol}</td>
                  <td className="px-4 py-3">{a.condition === 'above' ? 'Boven' : 'Onder'}</td>
                  <td className="px-4 py-3 text-right">{fmtEur(Number(a.target_price))}</td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={a.is_active}
                      onChange={(e) => onToggle(a.id, e.target.checked)}
                      disabled={pending}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onDelete(a.id)}
                      disabled={pending}
                      className="rounded border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-secondary)] hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
                    >
                      Verwijder
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

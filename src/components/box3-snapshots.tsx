'use client';

import { useTransition } from 'react';
import { deleteBox3Snapshot } from '@/app/tax/actions';

export type Box3Snapshot = {
  snapshot_date: string;
  year: number;
  total_wealth: number;
  taxable_wealth: number;
  estimated_tax: number;
  tax_free_allowance: number;
};

function fmtEur(n: number): string {
  return `€${Number(n).toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`;
}

export function Box3Snapshots({ snapshots }: { snapshots: Box3Snapshot[] }) {
  const [pending, startTransition] = useTransition();

  if (snapshots.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-secondary)]">
        Nog geen snapshots. Bereken de Box 3 hierboven en klik op <strong>Bewaar snapshot</strong> om er één voor de aangifte te bewaren.
      </div>
    );
  }

  function onDelete(date: string, year: number) {
    if (!confirm(`Snapshot voor ${year} verwijderen?`)) return;
    startTransition(async () => { await deleteBox3Snapshot(date); });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
      <table className="w-full text-sm">
        <thead className="bg-[var(--bg-panel)] text-[var(--text-secondary)]">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Jaar</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Vermogen</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Vrijstelling</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Belastbaar</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Geschatte belasting</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {snapshots.map((s) => (
            <tr key={s.snapshot_date} className="border-t border-[var(--border)]">
              <td className="px-4 py-3 font-semibold">{s.year}</td>
              <td className="px-4 py-3 text-right">{fmtEur(Number(s.total_wealth))}</td>
              <td className="px-4 py-3 text-right">{fmtEur(Number(s.tax_free_allowance))}</td>
              <td className="px-4 py-3 text-right">{fmtEur(Number(s.taxable_wealth))}</td>
              <td className="px-4 py-3 text-right text-[var(--danger)]">
                {fmtEur(Number(s.estimated_tax))}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => onDelete(s.snapshot_date, s.year)}
                  disabled={pending}
                  className="rounded-lg border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-secondary)] hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
                >
                  Verwijder
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import type { FifoResult } from '@/lib/fifo';

function fmtEur(n: number, frac = 2): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}€${n.toLocaleString('nl-NL', { minimumFractionDigits: frac, maximumFractionDigits: frac })}`;
}

function fmtDate(iso: string): string {
  const d = iso.slice(0, 10).split('-');
  return `${d[2]}-${d[1]}-${d[0]}`;
}

export function RealizedGains({ result }: { result: FifoResult }) {
  const years = useMemo(() => {
    const set = new Set<number>();
    for (const s of result.sales) set.add(new Date(s.date).getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [result.sales]);

  const [year, setYear] = useState<number | 'all'>('all');

  const filtered = useMemo(
    () =>
      year === 'all'
        ? result.sales
        : result.sales.filter((s) => new Date(s.date).getFullYear() === year),
    [result.sales, year],
  );

  const periodTotal = filtered.reduce((s, r) => s + r.realized, 0);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Gerealiseerde resultaten (FIFO)</h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Winst/verlies bij verkopen, eerste-in-eerste-uit-methode. Voor NL-belastingaangifte van toepassing.
          </p>
        </div>
        {years.length > 0 && (
          <div className="flex gap-1 rounded-lg border border-[var(--border)] p-1">
            <button
              type="button"
              onClick={() => setYear('all')}
              className={`rounded px-3 py-1 text-sm transition ${
                year === 'all'
                  ? 'bg-[var(--bg-panel)] text-[var(--accent)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Alle
            </button>
            {years.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setYear(y)}
                className={`rounded px-3 py-1 text-sm transition ${
                  year === y
                    ? 'bg-[var(--bg-panel)] text-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Periode resultaat"
          value={fmtEur(periodTotal)}
          tone={periodTotal >= 0 ? 'positive' : 'negative'}
        />
        <Stat label="Aantal verkopen" value={String(filtered.length)} />
        <Stat
          label="Verkochte waarde"
          value={fmtEur(
            filtered.reduce((s, r) => s + r.quantity * r.sellPrice, 0),
            0,
          )}
          tone="muted"
        />
      </div>

      {filtered.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-panel)] text-[var(--text-secondary)]">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide">Datum</th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide">Symbool</th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide">Aantal</th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide">Verkoopprijs</th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide">Cost basis</th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide">Resultaat</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={i} className="border-t border-[var(--border)]">
                  <td className="px-4 py-2">{fmtDate(s.date)}</td>
                  <td className="px-4 py-2 font-medium">{s.symbol}</td>
                  <td className="px-4 py-2 text-right">
                    {s.quantity.toLocaleString('nl-NL', { maximumFractionDigits: 4 })}
                  </td>
                  <td className="px-4 py-2 text-right">€{s.sellPrice.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right">€{s.costBasis.toFixed(2)}</td>
                  <td
                    className={`px-4 py-2 text-right font-semibold ${
                      s.realized >= 0 ? 'text-[var(--accent)]' : 'text-[var(--danger)]'
                    }`}
                  >
                    {fmtEur(s.realized)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'positive' | 'negative' | 'neutral' | 'muted';
}) {
  const color =
    tone === 'positive'
      ? 'text-[var(--accent)]'
      : tone === 'negative'
        ? 'text-[var(--danger)]'
        : tone === 'muted'
          ? 'text-[var(--text-secondary)]'
          : 'text-[var(--text-primary)]';
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

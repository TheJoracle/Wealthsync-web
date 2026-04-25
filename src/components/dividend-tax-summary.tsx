'use client';

import { useMemo, useState } from 'react';

export type DividendTaxRow = {
  payment_date: string;
  symbol: string;
  total_amount: number;
  withholding_tax_amount: number | null;
  net_amount: number | null;
  source_country: string | null;
};

function fmtEur(n: number, frac = 2): string {
  return `€${n.toLocaleString('nl-NL', { minimumFractionDigits: frac, maximumFractionDigits: frac })}`;
}

export function DividendTaxSummary({ dividends }: { dividends: DividendTaxRow[] }) {
  const years = useMemo(() => {
    const set = new Set<number>();
    for (const d of dividends) set.add(new Date(d.payment_date).getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [dividends]);

  const [year, setYear] = useState<number | null>(years[0] ?? null);

  const filtered = useMemo(
    () =>
      year === null
        ? []
        : dividends.filter((d) => new Date(d.payment_date).getFullYear() === year),
    [dividends, year],
  );

  const byCountry = useMemo(() => {
    const map = new Map<string, { gross: number; withholding: number; count: number }>();
    for (const d of filtered) {
      const country = d.source_country ?? '–';
      const cur = map.get(country) ?? { gross: 0, withholding: 0, count: 0 };
      cur.gross += Number(d.total_amount);
      cur.withholding += Number(d.withholding_tax_amount ?? 0);
      cur.count += 1;
      map.set(country, cur);
    }
    return Array.from(map, ([country, v]) => ({ country, ...v })).sort(
      (a, b) => b.gross - a.gross,
    );
  }, [filtered]);

  function exportCsv() {
    if (!year) return;
    const headers = [
      'payment_date',
      'symbol',
      'source_country',
      'total_amount_gross',
      'withholding_tax_amount',
      'net_amount',
    ];
    const rows = filtered.map((d) => {
      const wht = Number(d.withholding_tax_amount ?? 0);
      const net = Number(d.net_amount ?? Number(d.total_amount) - wht);
      return [
        d.payment_date,
        d.symbol,
        d.source_country ?? '',
        Number(d.total_amount).toFixed(2),
        wht.toFixed(2),
        net.toFixed(2),
      ];
    });
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dividenden-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (years.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-secondary)]">
        Nog geen dividenden gesynced. Trigger een Trading 212-sync om dividend-historie op te halen.
      </div>
    );
  }

  const totalGross = filtered.reduce((s, d) => s + Number(d.total_amount), 0);
  const totalWht = filtered.reduce((s, d) => s + Number(d.withholding_tax_amount ?? 0), 0);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Dividendbelasting per jaar</h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Buitenlandse bronbelasting kun je verrekenen via aangifte (max. 15% met belastingverdrag).
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={year ?? ''}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!year || filtered.length === 0}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
          >
            ⬇ Export CSV
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Bruto dividend" value={fmtEur(totalGross)} />
        <Stat label="Bronbelasting" value={fmtEur(totalWht)} tone="muted" />
        <Stat label="Aantal betalingen" value={String(filtered.length)} tone="muted" />
      </div>

      {byCountry.length > 0 && (
        <div className="mt-6">
          <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Per bronland
          </h4>
          <div className="overflow-hidden rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-panel)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide">Land</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide">Bruto</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide">Bronbelasting</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide">#</th>
                </tr>
              </thead>
              <tbody>
                {byCountry.map((row) => (
                  <tr key={row.country} className="border-t border-[var(--border)]">
                    <td className="px-4 py-2 font-medium">{row.country}</td>
                    <td className="px-4 py-2 text-right">{fmtEur(row.gross)}</td>
                    <td className="px-4 py-2 text-right">{fmtEur(row.withholding)}</td>
                    <td className="px-4 py-2 text-right">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
  tone?: 'neutral' | 'muted';
}) {
  const color = tone === 'muted' ? 'text-[var(--text-secondary)]' : 'text-[var(--accent)]';
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

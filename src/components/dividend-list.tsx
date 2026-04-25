'use client';

import { useMemo, useState } from 'react';

export type DividendRow = {
  id: number;
  symbol: string;
  amount_per_share: number;
  total_amount: number;
  payment_date: string;
  currency: string;
  dividend_type: string;
  source_country: string | null;
  withholding_tax_rate: number | null;
  withholding_tax_amount: number | null;
  net_amount: number | null;
};

function fmtEur(n: number, frac = 2): string {
  return `€${n.toLocaleString('nl-NL', {
    minimumFractionDigits: frac,
    maximumFractionDigits: frac,
  })}`;
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}

export function DividendList({ dividends }: { dividends: DividendRow[] }) {
  // Available years (newest first)
  const years = useMemo(() => {
    const set = new Set<number>();
    for (const d of dividends) set.add(new Date(d.payment_date).getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [dividends]);

  const [yearFilter, setYearFilter] = useState<number | 'all'>(years[0] ?? 'all');

  const filtered = useMemo(
    () =>
      yearFilter === 'all'
        ? dividends
        : dividends.filter((d) => new Date(d.payment_date).getFullYear() === yearFilter),
    [dividends, yearFilter],
  );

  const totalGross = filtered.reduce((s, d) => s + Number(d.total_amount), 0);
  const totalWithholding = filtered.reduce(
    (s, d) => s + Number(d.withholding_tax_amount ?? 0),
    0,
  );
  const totalNet = filtered.reduce(
    (s, d) =>
      s +
      Number(
        d.net_amount ??
          Number(d.total_amount) - Number(d.withholding_tax_amount ?? 0),
      ),
    0,
  );

  // Per-symbol breakdown for the filter range
  const bySymbol = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const d of filtered) {
      const cur = map.get(d.symbol) ?? { count: 0, total: 0 };
      cur.count += 1;
      cur.total += Number(d.total_amount);
      map.set(d.symbol, cur);
    }
    return Array.from(map, ([symbol, v]) => ({ symbol, ...v })).sort(
      (a, b) => b.total - a.total,
    );
  }, [filtered]);

  if (dividends.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-card)] p-8 text-center">
        <p className="text-[var(--text-secondary)]">
          Nog geen dividenden. Trigger een sync van Trading 212 op{' '}
          <a href="/connections" className="text-[var(--accent)] hover:underline">
            Connections
          </a>{' '}
          — die haalt automatisch ook je dividend-historie op.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-[var(--border)] p-1">
          <button
            type="button"
            onClick={() => setYearFilter('all')}
            className={`rounded px-3 py-1 text-sm transition ${
              yearFilter === 'all'
                ? 'bg-[var(--bg-panel)] text-[var(--accent)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Alle jaren
          </button>
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setYearFilter(y)}
              className={`rounded px-3 py-1 text-sm transition ${
                yearFilter === y
                  ? 'bg-[var(--bg-panel)] text-[var(--accent)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          {filtered.length} betaling{filtered.length === 1 ? '' : 'en'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Bruto ontvangen" value={fmtEur(totalGross)} tone="positive" />
        <Stat label="Bronbelasting" value={fmtEur(totalWithholding)} tone="muted" />
        <Stat label="Netto ontvangen" value={fmtEur(totalNet)} tone="positive" />
      </div>

      {bySymbol.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Per asset
          </h3>
          <div className="flex flex-col gap-2">
            {bySymbol.map((row) => (
              <div
                key={row.symbol}
                className="flex items-center justify-between border-b border-[var(--border)] pb-2 last:border-0"
              >
                <span className="font-semibold">{row.symbol}</span>
                <span className="text-sm text-[var(--text-secondary)]">
                  {row.count} × · {fmtEur(row.total)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-panel)] text-[var(--text-secondary)]">
            <tr>
              <Th>Datum</Th>
              <Th>Symbool</Th>
              <Th align="right">Per aandeel</Th>
              <Th align="right">Totaal bruto</Th>
              <Th align="right">Bronbelasting</Th>
              <Th align="right">Netto</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => {
              const wht = Number(d.withholding_tax_amount ?? 0);
              const net = Number(
                d.net_amount ?? Number(d.total_amount) - wht,
              );
              return (
                <tr key={d.id} className="border-t border-[var(--border)]">
                  <Td>{fmtDate(d.payment_date)}</Td>
                  <Td>
                    <span className="font-medium">{d.symbol}</span>
                    {d.source_country && (
                      <span className="ml-2 text-xs text-[var(--text-muted)]">{d.source_country}</span>
                    )}
                  </Td>
                  <Td align="right">{fmtEur(Number(d.amount_per_share), 4)}</Td>
                  <Td align="right">{fmtEur(Number(d.total_amount))}</Td>
                  <Td align="right">{wht > 0 ? fmtEur(wht) : '—'}</Td>
                  <Td align="right" className="font-semibold">{fmtEur(net)}</Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'positive' | 'muted';
}) {
  const color =
    tone === 'positive' ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]';
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = 'left',
  className = '',
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) {
  return (
    <td className={`px-4 py-3 ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}>
      {children}
    </td>
  );
}

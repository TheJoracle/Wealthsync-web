'use client';

import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DEFAULT_RANGE_INDEX, RANGES } from '@/lib/ranges';

export type TypeHistoryPoint = {
  date: string;
  etf_value: number;
  crypto_value: number;
  commodity_value: number;
  stock_value: number;
};

function fmtEur(n: number) {
  return `€${n.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`;
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}

const SERIES = [
  { key: 'etf_value', label: 'ETFs', color: 'var(--brand)' },
  { key: 'stock_value', label: 'Stocks', color: 'var(--brand-secondary)' },
  { key: 'crypto_value', label: 'Crypto', color: 'var(--warning)' },
  { key: 'commodity_value', label: 'Commodities', color: 'var(--brand-link)' },
] as const;

export function TypeGrowthChart({ data }: { data: TypeHistoryPoint[] }) {
  const [rangeIndex, setRangeIndex] = useState(DEFAULT_RANGE_INDEX);
  const range = RANGES[rangeIndex];

  const filtered = useMemo(() => {
    const cutoff = range.getCutoff();
    if (cutoff === Number.NEGATIVE_INFINITY) return data;
    return data.filter((p) => new Date(p.date).getTime() >= cutoff);
  }, [data, range]);

  if (filtered.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-card)] p-8 text-center text-[var(--text-secondary)]">
        Geen geschiedenis voor deze periode.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Groei per asset-type</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Gestapeld overzicht: ETFs, stocks, crypto en commodities over tijd.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg border border-[var(--border)] p-1">
          {RANGES.map((r, i) => (
            <button
              key={r.label}
              type="button"
              onClick={() => setRangeIndex(i)}
              className={`rounded px-2.5 py-1 text-sm transition ${
                i === rangeIndex
                  ? 'bg-[var(--bg-panel)] text-[var(--brand)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filtered}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={fmtDate}
              stroke="var(--text-muted)"
              fontSize={12}
              minTickGap={32}
            />
            <YAxis
              tickFormatter={(n) => `€${(n / 1000).toFixed(0)}k`}
              stroke="var(--text-muted)"
              fontSize={12}
              width={50}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-panel)',
                border: '1px solid var(--border)',
                borderRadius: '0.5rem',
                color: 'var(--text-primary)',
              }}
              labelFormatter={(label) => fmtDate(String(label))}
              formatter={(value) => fmtEur(Number(value))}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
            {SERIES.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stackId="1"
                stroke={s.color}
                fill={s.color}
                fillOpacity={0.4}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

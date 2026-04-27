'use client';

import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DEFAULT_RANGE_INDEX, RANGES } from '@/lib/ranges';

export type PricePoint = { date: string; price: number };

function fmtEur(n: number, frac = 2): string {
  return `€${n.toLocaleString('nl-NL', { minimumFractionDigits: frac, maximumFractionDigits: frac })}`;
}

function fmtDate(iso: string): string {
  const d = iso.slice(0, 10).split('-');
  return `${d[2]}/${d[1]}/${d[0].slice(2)}`;
}

export function AssetPriceChart({ data, symbol }: { data: PricePoint[]; symbol: string }) {
  const [rangeIndex, setRangeIndex] = useState(DEFAULT_RANGE_INDEX);
  const range = RANGES[rangeIndex];

  const filtered = useMemo(() => {
    const cutoff = range.getCutoff();
    if (cutoff === Number.NEGATIVE_INFINITY) return data;
    return data.filter((p) => new Date(p.date).getTime() >= cutoff);
  }, [data, range]);

  if (filtered.length < 2) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Nog onvoldoende prijsgeschiedenis voor {symbol} in deze periode.
      </div>
    );
  }

  const first = filtered[0].price;
  const last = filtered[filtered.length - 1].price;
  const pct = first > 0 ? ((last - first) / first) * 100 : 0;
  const positive = pct >= 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Prijsgeschiedenis</h3>
          <p className="text-sm text-muted-foreground">
            {fmtEur(first, 2)} → {fmtEur(last, 2)}{' '}
            <span className={positive ? 'text-primary' : 'text-destructive'}>
              ({positive ? '+' : ''}
              {pct.toFixed(1)}%)
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg border border-border p-1">
          {RANGES.map((r, i) => (
            <button
              key={r.label}
              type="button"
              onClick={() => setRangeIndex(i)}
              className={`rounded px-2.5 py-1 text-sm transition ${
                i === rangeIndex
                  ? 'bg-muted text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filtered}>
            <defs>
              <linearGradient id="assetPriceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={fmtDate}
              stroke="var(--text-muted)"
              fontSize={12}
              minTickGap={32}
            />
            <YAxis
              tickFormatter={(n) => `€${Number(n).toFixed(0)}`}
              stroke="var(--text-muted)"
              fontSize={12}
              width={60}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-color)',
                borderRadius: '0.5rem',
                color: 'var(--text-primary)',
              }}
              labelFormatter={(label) => fmtDate(String(label))}
              formatter={(value) => [fmtEur(Number(value)), symbol]}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="var(--brand)"
              strokeWidth={2}
              fill="url(#assetPriceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

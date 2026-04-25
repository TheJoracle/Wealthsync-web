'use client';

import { useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type HistoryPoint = {
  date: string; // YYYY-MM-DD
  total_value: number;
};

export type BenchmarkSeries = {
  symbol: string;
  name: string;
  points: { date: string; price: number }[];
};

const RANGES = [
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '1y', days: 365 },
  { label: 'All', days: Number.POSITIVE_INFINITY },
] as const;

function fmtEur(n: number) {
  return `€${n.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`;
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}

type Props = {
  data: HistoryPoint[];
  benchmarks: BenchmarkSeries[];
};

export function PortfolioHistoryChart({ data, benchmarks }: Props) {
  const [rangeIndex, setRangeIndex] = useState(0);
  const [benchmarkSymbol, setBenchmarkSymbol] = useState<string>('');
  const range = RANGES[rangeIndex];

  const filtered = useMemo(() => {
    if (range.days === Number.POSITIVE_INFINITY) return data;
    const cutoff = Date.now() - range.days * 24 * 60 * 60 * 1000;
    return data.filter((p) => new Date(p.date).getTime() >= cutoff);
  }, [data, range]);

  const merged = useMemo(() => {
    if (!benchmarkSymbol) return filtered.map((p) => ({ ...p }));
    const series = benchmarks.find((b) => b.symbol === benchmarkSymbol);
    if (!series || filtered.length === 0) return filtered.map((p) => ({ ...p }));

    // Normalize benchmark to portfolio start value: scale benchmark so its
    // first in-range point equals the portfolio's first point.
    const portfolioStart = filtered[0].total_value;
    const filterStartTime = new Date(filtered[0].date).getTime();
    const benchInRange = series.points.filter(
      (p) => new Date(p.date).getTime() >= filterStartTime,
    );
    if (benchInRange.length === 0) return filtered.map((p) => ({ ...p }));

    const benchStart = benchInRange[0].price;
    const ratio = portfolioStart / benchStart;
    const benchByDate = new Map(
      benchInRange.map((p) => [p.date, p.price * ratio]),
    );

    // For each portfolio point, attach the closest benchmark price (same
    // date, or carry forward last known if benchmark missed a day).
    let lastBench: number | null = portfolioStart;
    return filtered.map((p) => {
      const exact = benchByDate.get(p.date);
      if (exact !== undefined) lastBench = exact;
      return { ...p, benchmark: lastBench };
    });
  }, [filtered, benchmarks, benchmarkSymbol]);

  if (filtered.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-card)] p-8 text-center text-[var(--text-secondary)]">
        Nog geen geschiedenis voor deze periode.
      </div>
    );
  }

  const first = filtered[0].total_value;
  const last = filtered[filtered.length - 1].total_value;
  const pct = first === 0 ? 0 : ((last - first) / first) * 100;
  const positive = pct >= 0;

  // Benchmark performance over the same period
  const selectedBench = benchmarks.find((b) => b.symbol === benchmarkSymbol);
  let benchPct: number | null = null;
  if (selectedBench && filtered.length > 0) {
    const start = new Date(filtered[0].date).getTime();
    const inRange = selectedBench.points.filter(
      (p) => new Date(p.date).getTime() >= start,
    );
    if (inRange.length >= 2) {
      const bf = inRange[0].price;
      const bl = inRange[inRange.length - 1].price;
      benchPct = bf === 0 ? 0 : ((bl - bf) / bf) * 100;
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Portfolio-geschiedenis</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            {fmtEur(first)} → {fmtEur(last)}{' '}
            <span className={positive ? 'text-[var(--accent)]' : 'text-[var(--danger)]'}>
              ({positive ? '+' : ''}
              {pct.toFixed(1)}%)
            </span>
            {selectedBench && benchPct !== null && (
              <>
                {' · '}
                <span className="text-[var(--text-muted)]">{selectedBench.name}:</span>{' '}
                <span className={benchPct >= 0 ? 'text-[var(--accent-link)]' : 'text-[var(--danger)]'}>
                  {benchPct >= 0 ? '+' : ''}
                  {benchPct.toFixed(1)}%
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={benchmarkSymbol}
            onChange={(e) => setBenchmarkSymbol(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          >
            <option value="">Geen benchmark</option>
            {benchmarks.map((b) => (
              <option key={b.symbol} value={b.symbol}>
                vs {b.name}
              </option>
            ))}
          </select>
          <div className="flex gap-1 rounded-lg border border-[var(--border)] p-1">
            {RANGES.map((r, i) => (
              <button
                key={r.label}
                type="button"
                onClick={() => setRangeIndex(i)}
                className={`rounded px-3 py-1 text-sm transition ${
                  i === rangeIndex
                    ? 'bg-[var(--bg-panel)] text-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={merged} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              formatter={(value, name) => [
                fmtEur(Number(value)),
                name === 'total_value' ? 'Portfolio' : (selectedBench?.name ?? 'Benchmark'),
              ]}
            />
            <Area
              type="monotone"
              dataKey="total_value"
              stroke="var(--accent)"
              strokeWidth={2}
              fill="url(#portfolioGradient)"
            />
            {selectedBench && (
              <Line
                type="monotone"
                dataKey="benchmark"
                stroke="var(--accent-link)"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

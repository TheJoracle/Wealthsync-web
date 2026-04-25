'use client';

import { useMemo, useState } from 'react';
import {
  annualizedVolatility,
  maxDrawdown,
  periodReturn,
  totalReturnOnCost,
  type HistoryPoint,
} from '@/lib/metrics';
import { DEFAULT_RANGE_INDEX, RANGES } from '@/lib/ranges';

function fmtPct(v: number | null, sign = true): string {
  if (v === null) return '—';
  const pct = v * 100;
  return `${sign && pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

function fmtEur(n: number) {
  return `€${n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type Props = {
  history: HistoryPoint[];
  currentValue: number;
  totalInvested: number;
};

export function MetricsCards({ history, currentValue, totalInvested }: Props) {
  const [rangeIndex, setRangeIndex] = useState(DEFAULT_RANGE_INDEX);
  const range = RANGES[rangeIndex];

  const filtered = useMemo(() => {
    const cutoff = range.getCutoff();
    if (cutoff === Number.NEGATIVE_INFINITY) return history;
    return history.filter((p) => new Date(p.date).getTime() >= cutoff);
  }, [history, range]);

  const total = totalReturnOnCost(currentValue, totalInvested);
  const period = periodReturn(filtered);
  const drawdown = maxDrawdown(filtered);
  const vol = annualizedVolatility(filtered);
  const totalPnl = currentValue - totalInvested;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Performance</h3>
        <div className="flex flex-wrap gap-1 rounded-lg border border-[var(--border)] p-1">
          {RANGES.map((r, i) => (
            <button
              key={r.label}
              type="button"
              onClick={() => setRangeIndex(i)}
              className={`rounded px-2.5 py-1 text-sm transition ${
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metric
          label="Totaal P&L"
          value={fmtEur(totalPnl)}
          subValue={fmtPct(total)}
          tone={totalPnl >= 0 ? 'positive' : 'negative'}
          hint="Sinds aankoop"
        />
        <Metric
          label="Periode-return"
          value={fmtPct(period)}
          tone={period === null ? 'neutral' : period >= 0 ? 'positive' : 'negative'}
          hint={range.label}
        />
        <Metric
          label="Max drawdown"
          value={fmtPct(drawdown, false)}
          tone={drawdown < -0.1 ? 'negative' : 'neutral'}
          hint={range.label}
        />
        <Metric
          label="Volatiliteit"
          value={fmtPct(vol, false)}
          tone="neutral"
          hint="Geannualiseerd"
        />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  subValue,
  tone,
  hint,
}: {
  label: string;
  value: string;
  subValue?: string;
  tone: 'positive' | 'negative' | 'neutral';
  hint: string;
}) {
  const color =
    tone === 'positive'
      ? 'text-[var(--accent)]'
      : tone === 'negative'
        ? 'text-[var(--danger)]'
        : 'text-[var(--text-primary)]';

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
      {subValue && <p className={`text-sm font-medium ${color}`}>{subValue}</p>}
      <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>
    </div>
  );
}

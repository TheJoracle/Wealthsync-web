'use client';

import { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = [
  'var(--accent)',
  'var(--accent-secondary)',
  'var(--warning)',
  'var(--accent-link)',
  'var(--danger)',
  '#9333ea',
  '#06b6d4',
  '#f97316',
];

function fmtEur(n: number): string {
  return `€${n.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`;
}

export type BreakdownInput = {
  label: string;
  value: number;
  category: string | null;
};

/** Generic pie-chart breakdown by a label field (sector, geography, etc.). */
export function BreakdownChart({
  title,
  emptyHint,
  data,
}: {
  title: string;
  emptyHint: string;
  data: BreakdownInput[];
}) {
  const aggregated = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const r of data) {
      const cat = r.category ?? 'Onbekend';
      buckets.set(cat, (buckets.get(cat) ?? 0) + Number(r.value));
    }
    return Array.from(buckets, ([category, value]) => ({ category, value }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const total = aggregated.reduce((s, r) => s + r.value, 0);

  if (aggregated.length === 0 || (aggregated.length === 1 && aggregated[0].category === 'Onbekend')) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
      <h3 className="mb-4 text-lg font-semibold">{title}</h3>
      <div className="grid items-center gap-6 sm:grid-cols-2">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={aggregated}
                dataKey="value"
                nameKey="category"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                stroke="var(--bg-card)"
              >
                {aggregated.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.5rem',
                  color: 'var(--text-primary)',
                }}
                formatter={(value) => [fmtEur(Number(value)), '']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-2">
          {aggregated.map((row, i) => {
            const pct = total === 0 ? 0 : (row.value / total) * 100;
            return (
              <div
                key={row.category}
                className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-2 last:border-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  <span className="truncate text-sm">{row.category}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{fmtEur(row.value)}</div>
                  <div className="text-xs text-[var(--text-muted)]">{pct.toFixed(1)}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

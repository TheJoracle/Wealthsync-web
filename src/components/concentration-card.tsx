'use client';

import { computeConcentration } from '@/lib/concentration';

export function ConcentrationCard({ values, topSymbol }: { values: number[]; topSymbol: string }) {
  const c = computeConcentration(values);
  if (!c) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="text-lg font-semibold">Concentratie-rating</h3>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Geen data.</p>
      </div>
    );
  }

  const color =
    c.rating === 'spread'
      ? 'var(--accent)'
      : c.rating === 'moderate'
        ? 'var(--warning)'
        : 'var(--danger)';

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Concentratie-rating</h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Herfindahl-Hirschman Index over je posities. Hoger = meer geconcentreerd.
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold" style={{ color }}>{Math.round(c.hhi)}</div>
          <div className="text-xs uppercase tracking-wide" style={{ color }}>{c.ratingLabel}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Effectieve spreiding" value={c.effectiveCount.toFixed(1)} hint="Equivalent aantal gelijke posities" />
        <Stat label="Grootste positie" value={`${(c.topShare * 100).toFixed(1)}%`} hint={topSymbol} />
        <Stat
          label="Bandbreedte"
          value={c.rating === 'spread' ? '< 1500' : c.rating === 'moderate' ? '1500-2500' : '> 2500'}
          hint="HHI"
        />
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}

'use client';

import { useMemo, useState, useTransition } from 'react';
import { saveBox3Snapshot } from '@/app/tax/actions';
import { calculateBox3 } from '@/lib/box3';

function fmtEur(n: number): string {
  return `€${n.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`;
}

function fmtPct(n: number, frac = 2): string {
  return `${(n * 100).toFixed(frac)}%`;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR + 1, CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

export function Box3Calculator({
  initialWealth,
}: {
  initialWealth: number;
}) {
  const [wealth, setWealth] = useState(initialWealth);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [couple, setCouple] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const result = useMemo(
    () => calculateBox3(wealth, { year, couple }),
    [wealth, year, couple],
  );

  function onSaveSnapshot() {
    setError(null);
    setSaved(false);
    const fd = new FormData();
    fd.set('year', String(year));
    fd.set('wealth', String(wealth));
    if (couple) fd.set('couple', 'on');
    startTransition(async () => {
      const r = await saveBox3Snapshot(fd);
      if (r?.error) setError(r.error);
      else setSaved(true);
    });
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
      <h3 className="text-lg font-semibold">Box 3 Vermogensrendementsheffing</h3>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Berekening op basis van fictief rendement (2026 tarieven). Werkelijk-rendement-regime kun je los aangeven via de Belastingdienst.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field
          label="Belastingjaar"
          renderInput={() => (
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}
        />
        <Field
          label="Vermogen op 1 januari (€)"
          renderInput={() => (
            <input
              type="number"
              step="any"
              value={wealth}
              onChange={(e) => setWealth(Number(e.target.value))}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
            />
          )}
          hint={`Auto-ingevuld vanuit huidige portfolio: ${fmtEur(initialWealth)}`}
        />
        <Field
          label="Fiscaal partner"
          renderInput={() => (
            <label className="flex h-[42px] items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-3">
              <input
                type="checkbox"
                checked={couple}
                onChange={(e) => setCouple(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm text-[var(--text-secondary)]">
                Verdubbelt vrijstelling tot €114k
              </span>
            </label>
          )}
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <Stat label="Vrijstelling" value={fmtEur(result.taxFreeAllowance)} />
        <Stat label="Belastbaar" value={fmtEur(result.taxableWealth)} />
        <Stat label="Fictief rendement" value={fmtEur(result.deemedReturn)} hint={fmtPct(result.deemedReturn / Math.max(1, result.totalWealth))} />
        <Stat
          label="Geschatte belasting"
          value={fmtEur(result.estimatedTax)}
          tone="negative"
          hint={`Effectief ${fmtPct(result.effectiveRate, 3)}`}
        />
      </div>

      {result.brackets.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-panel)] text-[var(--text-secondary)]">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide">Schijf</th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide">Bedrag</th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide">Percentage</th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide">Fictief rend.</th>
              </tr>
            </thead>
            <tbody>
              {result.brackets.map((b) => (
                <tr key={b.name} className="border-t border-[var(--border)]">
                  <td className="px-4 py-2">{b.name}</td>
                  <td className="px-4 py-2 text-right">{fmtEur(b.amount)}</td>
                  <td className="px-4 py-2 text-right">{fmtPct(b.rate)}</td>
                  <td className="px-4 py-2 text-right">{fmtEur(b.deemedReturn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onSaveSnapshot}
          disabled={pending}
          className="rounded-lg bg-gradient-to-r from-[var(--brand)] to-[var(--brand-hover)] px-5 py-2.5 text-sm font-semibold text-[var(--on-brand)] transition hover:brightness-110 disabled:opacity-50"
        >
          {pending ? '...' : `Bewaar snapshot voor ${year}`}
        </button>
        {saved && <span className="text-sm text-[var(--brand)]">Opgeslagen ✓</span>}
        {error && <span className="text-sm text-[var(--danger)]">{error}</span>}
      </div>
    </div>
  );
}

function Field({
  label,
  renderInput,
  hint,
}: {
  label: string;
  renderInput: () => React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>
      {renderInput()}
      {hint && <span className="text-xs text-[var(--text-muted)]">{hint}</span>}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'negative';
}) {
  const color = tone === 'negative' ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]';
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import {
  projectForward,
  solveRequiredContribution,
  type ForwardResult,
} from '@/lib/retirement';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function fmtEur(n: number, frac = 0): string {
  return `€${Math.round(n).toLocaleString('nl-NL', {
    minimumFractionDigits: frac,
    maximumFractionDigits: frac,
  })}`;
}

type Mode = 'forward' | 'reverse';

export function RetirementCalculator({ initialSavings }: { initialSavings: number }) {
  const [mode, setMode] = useState<Mode>('forward');

  // Shared inputs (kept as strings so the input doesn't fight the user when
  // the field is briefly empty during edits)
  const [currentAge, setCurrentAge] = useState('30');
  const [retirementAge, setRetirementAge] = useState('67');
  const [currentSavings, setCurrentSavings] = useState(String(initialSavings));
  const [annualReturn, setAnnualReturn] = useState('7');

  // Forward-only
  const [monthlyContribution, setMonthlyContribution] = useState('500');

  // Reverse-only
  const [targetAmount, setTargetAmount] = useState('1000000');

  const num = (s: string) => Number(s) || 0;

  const forwardResult: ForwardResult | null = useMemo(() => {
    if (mode !== 'forward') return null;
    return projectForward({
      currentAge: num(currentAge),
      retirementAge: num(retirementAge),
      currentSavings: num(currentSavings),
      monthlyContribution: num(monthlyContribution),
      annualReturn: num(annualReturn) / 100,
    });
  }, [mode, currentAge, retirementAge, currentSavings, monthlyContribution, annualReturn]);

  const requiredPmt = useMemo(() => {
    if (mode !== 'reverse') return null;
    return solveRequiredContribution({
      currentAge: num(currentAge),
      targetAge: num(retirementAge),
      currentSavings: num(currentSavings),
      targetAmount: num(targetAmount),
      annualReturn: num(annualReturn) / 100,
    });
  }, [mode, currentAge, retirementAge, currentSavings, targetAmount, annualReturn]);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
      <h3 className="text-lg font-semibold">Pensioencalculator</h3>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Maandelijks inleggen, jaarlijks samengesteld rendement. Voer het <strong>reële</strong> rendement in (na inflatie) als je in vandaagse euro's wilt rekenen.
      </p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setMode('forward')}
          className={`rounded-lg border px-4 py-2 text-sm transition ${
            mode === 'forward'
              ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]'
              : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]'
          }`}
        >
          Bereken eindbedrag
        </button>
        <button
          type="button"
          onClick={() => setMode('reverse')}
          className={`rounded-lg border px-4 py-2 text-sm transition ${
            mode === 'reverse'
              ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]'
              : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]'
          }`}
        >
          Bereken benodigde inleg
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Num label="Huidige leeftijd" value={currentAge} onChange={setCurrentAge} step="1" />
        <Num label={mode === 'reverse' ? 'Doelleeftijd' : 'Pensioenleeftijd'} value={retirementAge} onChange={setRetirementAge} step="1" />
        <Num label="Huidig vermogen (€)" value={currentSavings} onChange={setCurrentSavings} step="100" />
        <Num label="Verwacht jaarrendement (%)" value={annualReturn} onChange={setAnnualReturn} step="0.1" />

        {mode === 'forward' ? (
          <Num
            label="Maandelijkse inleg (€)"
            value={monthlyContribution}
            onChange={setMonthlyContribution}
            step="50"
          />
        ) : (
          <Num
            label="Doelbedrag (€)"
            value={targetAmount}
            onChange={setTargetAmount}
            step="10000"
          />
        )}
      </div>

      {mode === 'forward' && forwardResult && (
        <div className="mt-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Eindbedrag" value={fmtEur(forwardResult.endingBalance)} tone="positive" />
            <Stat label="Totaal ingelegd" value={fmtEur(forwardResult.totalContributed)} tone="muted" />
            <Stat label="Rendement" value={fmtEur(forwardResult.totalGrowth)} tone="positive" />
          </div>
          <div className="mt-6 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forwardResult.yearByYear}>
                <defs>
                  <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="age" stroke="var(--text-muted)" fontSize={12} />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={12}
                  tickFormatter={(n) => `€${(n / 1000).toFixed(0)}k`}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.5rem',
                    color: 'var(--text-primary)',
                  }}
                  formatter={(value, name) => [fmtEur(Number(value)), name === 'balance' ? 'Saldo' : 'Ingelegd']}
                  labelFormatter={(age) => `Leeftijd ${age}`}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="var(--brand)"
                  strokeWidth={2}
                  fill="url(#balanceGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="contributed"
                  stroke="var(--text-muted)"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fill="none"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {mode === 'reverse' && requiredPmt !== null && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Stat
            label="Benodigde maandelijkse inleg"
            value={requiredPmt > 0 ? fmtEur(requiredPmt, 0) : 'Niets — je bent er al'}
            tone="positive"
          />
          <Stat
            label="Aantal jaren tot doel"
            value={`${num(retirementAge) - num(currentAge)} jaar`}
            tone="muted"
          />
        </div>
      )}
    </div>
  );
}

function Num({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-[var(--text-secondary)]">{label}</span>
      <input
        type="number"
        step={step ?? 'any'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
      />
    </label>
  );
}

function Stat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'positive' | 'muted' | 'neutral';
}) {
  const color =
    tone === 'positive'
      ? 'text-[var(--brand)]'
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

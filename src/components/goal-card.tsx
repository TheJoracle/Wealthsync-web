'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { deleteGoal, syncGoalToPortfolio } from '@/app/goals/actions';

export type Goal = {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  status: string;
  created_at: string;
};

function fmtEur(n: number, frac = 0): string {
  return `€${n.toLocaleString('nl-NL', {
    minimumFractionDigits: frac,
    maximumFractionDigits: frac,
  })}`;
}

function trackingState(goal: Goal): { label: string; color: string } {
  const progress = goal.target_amount > 0 ? goal.current_amount / goal.target_amount : 0;

  if (progress >= 1) return { label: 'Voltooid', color: 'var(--brand)' };
  if (!goal.target_date) return { label: 'Actief', color: 'var(--text-secondary)' };

  const target = new Date(goal.target_date).getTime();
  const created = new Date(goal.created_at).getTime();
  const now = Date.now();
  const totalSpan = target - created;
  if (totalSpan <= 0) return { label: 'Actief', color: 'var(--text-secondary)' };
  const timeProgress = Math.min(1, Math.max(0, (now - created) / totalSpan));

  if (progress >= timeProgress) return { label: 'Op koers', color: 'var(--brand)' };
  const gap = (timeProgress - progress) * 100;
  if (gap < 10) return { label: 'Net achter', color: 'var(--warning)' };
  return { label: 'Achterop', color: 'var(--danger)' };
}

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const ms = new Date(date).getTime() - Date.now();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function GoalCard({ goal }: { goal: Goal }) {
  const [pending, startTransition] = useTransition();
  const progress = goal.target_amount > 0
    ? Math.min(1, goal.current_amount / goal.target_amount)
    : 0;
  const remaining = Math.max(0, goal.target_amount - goal.current_amount);
  const days = daysUntil(goal.target_date);
  const state = trackingState(goal);

  function onSync() {
    startTransition(async () => { await syncGoalToPortfolio(goal.id); });
  }

  function onDelete() {
    if (!confirm(`Doel "${goal.name}" verwijderen?`)) return;
    startTransition(async () => { await deleteGoal(goal.id); });
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold">{goal.name}</h3>
          <div className="mt-1 flex items-center gap-2 text-sm">
            <span style={{ color: state.color }}>● {state.label}</span>
            {goal.target_date && (
              <span className="text-[var(--text-muted)]">
                · {goal.target_date}
                {days !== null &&
                  (days >= 0 ? ` (${days}d te gaan)` : ` (${-days}d geleden)`)}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onSync}
            disabled={pending}
            title="Vul huidig bedrag bij vanuit portfolio"
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:opacity-50"
          >
            ⟳
          </button>
          <Link
            href={`/goals/${goal.id}/edit`}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
          >
            Bewerk
          </Link>
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
          >
            Verwijder
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold">
            {fmtEur(goal.current_amount)} / {fmtEur(goal.target_amount)}
          </span>
          <span className="text-[var(--text-secondary)]">
            {(progress * 100).toFixed(1)}%
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--bg-panel)]">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progress * 100}%`,
              background: `linear-gradient(90deg, var(--brand), var(--brand-hover))`,
            }}
          />
        </div>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Nog {fmtEur(remaining)} te gaan
          {days !== null && days > 0 && remaining > 0 && (
            <> · €{(remaining / days * 30).toLocaleString('nl-NL', { maximumFractionDigits: 0 })}/maand nodig</>
          )}
        </p>
      </div>
    </div>
  );
}

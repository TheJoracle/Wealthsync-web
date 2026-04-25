'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type GoalFormValues = {
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
};

type Props = {
  initial?: Partial<GoalFormValues>;
  portfolioValue: number;
  onSubmit: (formData: FormData) => Promise<{ error?: string } | undefined>;
  submitLabel: string;
};

export function GoalForm({ initial, portfolioValue, onSubmit, submitLabel }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [currentAmount, setCurrentAmount] = useState(initial?.current_amount ?? 0);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await onSubmit(formData);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="text-sm font-medium text-[var(--text-secondary)]">
          Naam <span className="text-[var(--danger)]">*</span>
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={initial?.name}
          placeholder="Bijv. Pensioen, eerste huis, vakantiegeld"
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--brand)]"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="target_amount" className="text-sm font-medium text-[var(--text-secondary)]">
          Doelbedrag (€) <span className="text-[var(--danger)]">*</span>
        </label>
        <input
          id="target_amount"
          name="target_amount"
          type="number"
          step="any"
          required
          defaultValue={initial?.target_amount}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--brand)]"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor="current_amount" className="text-sm font-medium text-[var(--text-secondary)]">
            Huidig bedrag (€)
          </label>
          <button
            type="button"
            onClick={() => setCurrentAmount(portfolioValue)}
            className="text-xs text-[var(--brand)] hover:underline"
          >
            ⟳ Vul in vanuit portfolio (€{portfolioValue.toLocaleString('nl-NL', { maximumFractionDigits: 0 })})
          </button>
        </div>
        <input
          id="current_amount"
          name="current_amount"
          type="number"
          step="any"
          value={currentAmount}
          onChange={(e) => setCurrentAmount(Number(e.target.value))}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--brand)]"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="target_date" className="text-sm font-medium text-[var(--text-secondary)]">
          Streefdatum (optioneel)
        </label>
        <input
          id="target_date"
          name="target_date"
          type="date"
          defaultValue={initial?.target_date ?? ''}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--brand)]"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-[var(--danger)] bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      <div className="mt-2 flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gradient-to-r from-[var(--brand)] to-[var(--brand-hover)] px-6 py-3 font-semibold text-[var(--on-brand)] transition hover:brightness-110 disabled:opacity-50"
        >
          {pending ? '...' : submitLabel}
        </button>
        <Link
          href="/goals"
          className="rounded-lg border border-[var(--border)] px-6 py-3 font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-hover)]"
        >
          Annuleren
        </Link>
      </div>
    </form>
  );
}

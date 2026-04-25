'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ASSET_TYPES } from '@/app/assets/types';

type AssetFormValues = {
  name: string;
  symbol: string;
  type: string;
  amount: number;
  value: number;
  purchase_price: number;
  notes: string;
};

type Props = {
  initial?: Partial<AssetFormValues>;
  onSubmit: (formData: FormData) => Promise<{ error?: string } | undefined>;
  submitLabel: string;
};

export function AssetForm({ initial, onSubmit, submitLabel }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
      <Field label="Naam" name="name" defaultValue={initial?.name} required />

      <Field
        label="Symbool / Ticker"
        name="symbol"
        defaultValue={initial?.symbol}
        placeholder="Bijv. VWCE, BTC, GOLD"
        required
      />

      <Select
        label="Type"
        name="type"
        defaultValue={initial?.type ?? 'ETF'}
        options={ASSET_TYPES}
      />

      <Field
        label="Aantal (units / coins / grams)"
        name="amount"
        type="number"
        step="any"
        defaultValue={initial?.amount}
        required
      />

      <Field
        label="Huidige waarde (€)"
        name="value"
        type="number"
        step="any"
        defaultValue={initial?.value}
        required
        hint="Wordt dagelijks automatisch bijgewerkt via de cron."
      />

      <Field
        label="Aankoopprijs totaal (€, optioneel)"
        name="purchase_price"
        type="number"
        step="any"
        defaultValue={initial?.purchase_price ?? 0}
        hint="Totaal betaald voor alle units — voor winst/verlies-berekening."
      />

      <div className="flex flex-col gap-2">
        <label htmlFor="notes" className="text-sm font-medium text-[var(--text-secondary)]">
          Notities (optioneel)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={initial?.notes}
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
          href="/dashboard"
          className="rounded-lg border border-[var(--border)] px-6 py-3 font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-hover)]"
        >
          Annuleren
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = 'text',
  defaultValue,
  placeholder,
  step,
  required,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  placeholder?: string;
  step?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} className="text-sm font-medium text-[var(--text-secondary)]">
        {label}
        {required && <span className="text-[var(--danger)]"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        step={step}
        required={required}
        className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--brand)]"
      />
      {hint && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}

function Select({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: readonly string[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} className="text-sm font-medium text-[var(--text-secondary)]">
        {label} <span className="text-[var(--danger)]">*</span>
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--brand)]"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

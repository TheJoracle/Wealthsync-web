'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
  type TransactionType,
} from '@/app/transactions/types';

type TxFormValues = {
  type: TransactionType;
  symbol: string;
  quantity: number;
  price_per_unit: number;
  total_value: number;
  currency: string;
  fees: number;
  transaction_date: string;
  notes: string;
  asset_id: number | null;
};

type Asset = { id: number; symbol: string; name: string };

type Props = {
  initial?: Partial<TxFormValues>;
  assets: Asset[];
  onSubmit: (formData: FormData) => Promise<{ error?: string } | undefined>;
  submitLabel: string;
};

export function TransactionForm({ initial, assets, onSubmit, submitLabel }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [qty, setQty] = useState(initial?.quantity ?? 0);
  const [price, setPrice] = useState(initial?.price_per_unit ?? 0);
  const [fees, setFees] = useState(initial?.fees ?? 0);
  const [total, setTotal] = useState(
    initial?.total_value ?? 0,
  );
  const [totalDirty, setTotalDirty] = useState(false);

  // Auto-compute total = qty × price + fees, unless user has manually edited.
  const autoTotal = qty * price + fees;
  const effectiveTotal = totalDirty ? total : autoTotal;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.set('total_value', String(effectiveTotal));
    startTransition(async () => {
      const result = await onSubmit(formData);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" required>
          <select
            name="type"
            required
            defaultValue={initial?.type ?? 'buy'}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
          >
            {TRANSACTION_TYPES.map((t) => (
              <option key={t} value={t}>{TRANSACTION_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </Field>
        <Field label="Datum" required>
          <input
            type="date"
            name="transaction_date"
            required
            defaultValue={initial?.transaction_date?.slice(0, 10)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
          />
        </Field>
      </div>

      <Field label="Symbool" required hint="Bijv. VWCED, BTC. Wordt automatisch gekoppeld aan je asset.">
        <input
          name="symbol"
          required
          defaultValue={initial?.symbol}
          list="assets-datalist"
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
        />
        <datalist id="assets-datalist">
          {assets.map((a) => (
            <option key={a.id} value={a.symbol}>{a.name}</option>
          ))}
        </datalist>
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Aantal" required>
          <input
            type="number"
            step="any"
            name="quantity"
            required
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
          />
        </Field>
        <Field label="Prijs per stuk (€)" required>
          <input
            type="number"
            step="any"
            name="price_per_unit"
            required
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
          />
        </Field>
        <Field label="Kosten (€)">
          <input
            type="number"
            step="any"
            name="fees"
            value={fees}
            onChange={(e) => setFees(Number(e.target.value))}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
          />
        </Field>
      </div>

      <Field
        label="Totaalwaarde (€)"
        hint={totalDirty ? 'Handmatig overschreven.' : 'Auto: aantal × prijs + kosten'}
      >
        <input
          type="number"
          step="any"
          value={effectiveTotal}
          onChange={(e) => {
            setTotal(Number(e.target.value));
            setTotalDirty(true);
          }}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Valuta">
          <input
            name="currency"
            defaultValue={initial?.currency ?? 'EUR'}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
          />
        </Field>
        <Field label="Notities">
          <input
            name="notes"
            defaultValue={initial?.notes}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
          />
        </Field>
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
          href="/transactions"
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
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-[var(--text-secondary)]">
        {label}
        {required && <span className="text-[var(--danger)]"> *</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}

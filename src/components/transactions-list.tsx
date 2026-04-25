'use client';

import Link from 'next/link';
import { useTransition, useState, useMemo } from 'react';
import { deleteTransaction } from '@/app/transactions/actions';
import { TRANSACTION_TYPE_LABELS, type TransactionType } from '@/app/transactions/types';

export type TransactionRow = {
  id: number;
  type: string;
  symbol: string | null;
  quantity: number | null;
  price_per_unit: number | null;
  total_value: number;
  fees: number | null;
  currency: string | null;
  transaction_date: string;
  notes: string | null;
};

function fmtEur(n: number, frac = 2): string {
  return `€${n.toLocaleString('nl-NL', { minimumFractionDigits: frac, maximumFractionDigits: frac })}`;
}

function fmtDate(iso: string): string {
  const d = iso.slice(0, 10).split('-');
  return `${d[2]}-${d[1]}-${d[0]}`;
}

const FILTERS: Array<'all' | TransactionType> = [
  'all', 'buy', 'sell', 'dividend', 'deposit', 'withdrawal', 'fee',
];

const FILTER_LABELS: Record<typeof FILTERS[number], string> = {
  all: 'Alle',
  buy: 'Aankopen',
  sell: 'Verkopen',
  dividend: 'Dividend',
  deposit: 'Stortingen',
  withdrawal: 'Opnames',
  fee: 'Kosten',
};

export function TransactionsList({ transactions }: { transactions: TransactionRow[] }) {
  const [filter, setFilter] = useState<typeof FILTERS[number]>('all');
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(
    () => (filter === 'all' ? transactions : transactions.filter((t) => t.type === filter)),
    [transactions, filter],
  );

  function onDelete(id: number) {
    if (!confirm('Transactie verwijderen?')) return;
    startTransition(async () => { await deleteTransaction(id); });
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-card)] p-8 text-center">
        <p className="text-[var(--text-secondary)]">
          Nog geen transacties. Klik op <strong>Nieuwe transactie</strong> om er een toe te voegen,
          of trigger een Trading 212 sync — die importeert al je trades automatisch.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1 rounded-lg border border-[var(--border)] p-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded px-3 py-1 text-sm transition ${
              filter === f
                ? 'bg-[var(--bg-panel)] text-[var(--accent)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-panel)] text-[var(--text-secondary)]">
            <tr>
              <Th>Datum</Th>
              <Th>Type</Th>
              <Th>Symbool</Th>
              <Th align="right">Aantal</Th>
              <Th align="right">Prijs</Th>
              <Th align="right">Totaal</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const typeLabel = TRANSACTION_TYPE_LABELS[t.type as TransactionType] ?? t.type;
              const typeColor =
                t.type === 'sell' || t.type === 'withdrawal'
                  ? 'text-[var(--danger)]'
                  : t.type === 'buy' || t.type === 'deposit'
                    ? 'text-[var(--accent)]'
                    : 'text-[var(--text-secondary)]';
              return (
                <tr key={t.id} className="border-t border-[var(--border)]">
                  <Td>{fmtDate(t.transaction_date)}</Td>
                  <Td><span className={`font-medium ${typeColor}`}>{typeLabel}</span></Td>
                  <Td>{t.symbol ?? '—'}</Td>
                  <Td align="right">
                    {t.quantity !== null ? Number(t.quantity).toLocaleString('nl-NL') : '—'}
                  </Td>
                  <Td align="right">
                    {t.price_per_unit !== null ? fmtEur(Number(t.price_per_unit)) : '—'}
                  </Td>
                  <Td align="right" className="font-semibold">{fmtEur(Number(t.total_value))}</Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/transactions/${t.id}/edit`}
                        className="rounded border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                      >
                        Bewerk
                      </Link>
                      <button
                        type="button"
                        onClick={() => onDelete(t.id)}
                        disabled={pending}
                        className="rounded border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-secondary)] hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
                      >
                        Verwijder
                      </button>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, align = 'left' }: { children?: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = 'left',
  className = '',
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) {
  return (
    <td className={`px-4 py-3 ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}>
      {children}
    </td>
  );
}

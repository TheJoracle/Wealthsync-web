'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import {
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
  type TransactionType,
} from '@/app/transactions/types';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  const [type, setType] = useState<TransactionType>(initial?.type ?? 'buy');
  // String state: lets the user clear the field without it snapping back to 0.
  const [qty, setQty] = useState(initial?.quantity !== undefined ? String(initial.quantity) : '');
  const [price, setPrice] = useState(initial?.price_per_unit !== undefined ? String(initial.price_per_unit) : '');
  const [fees, setFees] = useState(initial?.fees !== undefined ? String(initial.fees) : '0');
  const [total, setTotal] = useState(initial?.total_value !== undefined ? String(initial.total_value) : '');
  const [totalDirty, setTotalDirty] = useState(false);

  const num = (s: string) => Number(s) || 0;
  const autoTotal = num(qty) * num(price) + num(fees);
  const effectiveTotal = totalDirty ? num(total) : autoTotal;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.set('type', type);
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
        <Field label="Type" htmlFor="type" required>
          <Select value={type} onValueChange={(v) => v && setType(v as TransactionType)}>
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRANSACTION_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{TRANSACTION_TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Datum" htmlFor="transaction_date" required>
          <Input
            id="transaction_date"
            type="date"
            name="transaction_date"
            required
            defaultValue={initial?.transaction_date?.slice(0, 10)}
          />
        </Field>
      </div>

      <Field
        label="Symbool"
        htmlFor="symbol"
        required
        hint="Bijv. VWCED, BTC. Wordt automatisch gekoppeld aan je asset."
      >
        <Input
          id="symbol"
          name="symbol"
          required
          defaultValue={initial?.symbol}
          list="assets-datalist"
        />
        <datalist id="assets-datalist">
          {assets.map((a) => (
            <option key={a.id} value={a.symbol}>{a.name}</option>
          ))}
        </datalist>
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Aantal" htmlFor="quantity" required>
          <Input
            id="quantity"
            type="number"
            step="any"
            name="quantity"
            required
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </Field>
        <Field label="Prijs per stuk (€)" htmlFor="price_per_unit" required>
          <Input
            id="price_per_unit"
            type="number"
            step="any"
            name="price_per_unit"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </Field>
        <Field label="Kosten (€)" htmlFor="fees">
          <Input
            id="fees"
            type="number"
            step="any"
            name="fees"
            value={fees}
            onChange={(e) => setFees(e.target.value)}
          />
        </Field>
      </div>

      <Field
        label="Totaalwaarde (€)"
        htmlFor="total_value_field"
        hint={totalDirty ? 'Handmatig overschreven.' : 'Auto: aantal × prijs + kosten'}
      >
        <Input
          id="total_value_field"
          type="number"
          step="any"
          value={totalDirty ? total : String(effectiveTotal)}
          onChange={(e) => {
            setTotal(e.target.value);
            setTotalDirty(true);
          }}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Valuta" htmlFor="currency">
          <Input id="currency" name="currency" defaultValue={initial?.currency ?? 'EUR'} />
        </Field>
        <Field label="Notities" htmlFor="notes">
          <Input id="notes" name="notes" defaultValue={initial?.notes} />
        </Field>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mt-2 flex gap-3">
        <Button type="submit" disabled={pending} size="lg">
          {pending && <Loader2 className="animate-spin" />}
          {submitLabel}
        </Button>
        <Link href="/transactions" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
          Annuleren
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

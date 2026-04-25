'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { ASSET_TYPES } from '@/app/assets/types';
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

type AssetFormValues = {
  name: string;
  symbol: string;
  type: string;
  amount: number;
  value: number;
  purchase_price: number;
  notes: string;
  sector: string;
  geography: string;
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
  const [type, setType] = useState<string>(initial?.type ?? 'ETF');

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.set('type', type);
    startTransition(async () => {
      const result = await onSubmit(formData);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Naam" htmlFor="name" required>
        <Input id="name" name="name" required defaultValue={initial?.name} />
      </Field>

      <Field
        label="Symbool / Ticker"
        htmlFor="symbol"
        required
      >
        <Input
          id="symbol"
          name="symbol"
          required
          defaultValue={initial?.symbol}
          placeholder="Bijv. VWCE, BTC, GOLD"
        />
      </Field>

      <Field label="Type" htmlFor="type" required>
        <Select value={type} onValueChange={(v) => v && setType(v)}>
          <SelectTrigger id="type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ASSET_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Aantal (units / coins / grams)" htmlFor="amount" required>
        <Input
          id="amount"
          name="amount"
          type="number"
          step="any"
          required
          defaultValue={initial?.amount}
        />
      </Field>

      <Field
        label="Huidige waarde (€)"
        htmlFor="value"
        required
        hint="Wordt dagelijks automatisch bijgewerkt via de cron."
      >
        <Input
          id="value"
          name="value"
          type="number"
          step="any"
          required
          defaultValue={initial?.value}
        />
      </Field>

      <Field
        label="Aankoopprijs totaal (€, optioneel)"
        htmlFor="purchase_price"
        hint="Totaal betaald voor alle units — voor winst/verlies-berekening."
      >
        <Input
          id="purchase_price"
          name="purchase_price"
          type="number"
          step="any"
          defaultValue={initial?.purchase_price ?? 0}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Sector (optioneel)"
          htmlFor="sector"
          hint="Bijv. Technology, Energy, Healthcare"
        >
          <Input
            id="sector"
            name="sector"
            defaultValue={initial?.sector ?? ''}
            placeholder="Bijv. Technology"
          />
        </Field>
        <Field
          label="Geografie (optioneel)"
          htmlFor="geography"
          hint="Bijv. USA, Europe, Global, Emerging markets"
        >
          <Input
            id="geography"
            name="geography"
            defaultValue={initial?.geography ?? ''}
            placeholder="Bijv. Global"
          />
        </Field>
      </div>

      <Field label="Notities (optioneel)" htmlFor="notes">
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={initial?.notes}
          className="flex w-full min-h-16 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </Field>

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
        <Link href="/dashboard" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
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

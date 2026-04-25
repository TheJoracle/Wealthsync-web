'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  const [currentAmount, setCurrentAmount] = useState(
    initial?.current_amount !== undefined ? String(initial.current_amount) : '0',
  );

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
        <Label htmlFor="name">
          Naam <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={initial?.name}
          placeholder="Bijv. Pensioen, eerste huis, vakantiegeld"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="target_amount">
          Doelbedrag (€) <span className="text-destructive">*</span>
        </Label>
        <Input
          id="target_amount"
          name="target_amount"
          type="number"
          step="any"
          required
          defaultValue={initial?.target_amount}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="current_amount">Huidig bedrag (€)</Label>
          <button
            type="button"
            onClick={() => setCurrentAmount(String(portfolioValue))}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <RefreshCw className="size-3" />
            Vul in vanuit portfolio (€{portfolioValue.toLocaleString('nl-NL', { maximumFractionDigits: 0 })})
          </button>
        </div>
        <Input
          id="current_amount"
          name="current_amount"
          type="number"
          step="any"
          value={currentAmount}
          onChange={(e) => setCurrentAmount(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="target_date">Streefdatum (optioneel)</Label>
        <Input
          id="target_date"
          name="target_date"
          type="date"
          defaultValue={initial?.target_date ?? ''}
        />
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
        <Link href="/goals" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
          Annuleren
        </Link>
      </div>
    </form>
  );
}

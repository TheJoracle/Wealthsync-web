'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calculator, Loader2 } from 'lucide-react';
import {
  ASSET_TYPES,
  ASSET_TYPE_LABELS,
  FIELD_RULES,
  type AssetType,
} from '@/app/assets/types';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const [type, setType] = useState<AssetType>((initial?.type as AssetType) ?? 'ETF');
  const [amount, setAmount] = useState(
    initial?.amount !== undefined ? String(initial.amount) : '',
  );
  const [value, setValue] = useState(
    initial?.value !== undefined ? String(initial.value) : '',
  );
  const rules = FIELD_RULES[type];

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.set('type', type);
    if (rules.amount === 'hidden') formData.set('amount', '1');
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

      <Field label="Type" htmlFor="type" required>
        <Select value={type} onValueChange={(v) => v && setType(v as AssetType)}>
          <SelectTrigger id="type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ASSET_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {ASSET_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {rules.symbol !== 'hidden' && (
        <Field
          label={rules.symbolLabel}
          htmlFor="symbol"
          required={rules.symbol === 'required'}
        >
          <Input
            id="symbol"
            name="symbol"
            required={rules.symbol === 'required'}
            defaultValue={initial?.symbol}
          />
        </Field>
      )}

      {rules.metalCalc && (
        <PhysicalMetalCalculator
          onResult={(grams, eurValue) => {
            setAmount(grams);
            setValue(eurValue);
          }}
        />
      )}

      {rules.amount !== 'hidden' && (
        <Field
          label={rules.amountLabel}
          htmlFor="amount"
          required={rules.amount === 'required'}
        >
          <Input
            id="amount"
            name="amount"
            type="number"
            step="any"
            required={rules.amount === 'required'}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
      )}

      <Field
        label="Huidige waarde (€)"
        htmlFor="value"
        required
        hint="Voor tradable assets dagelijks bijgewerkt via cron — voor handmatige entries (vastgoed, voertuig) zelf updaten."
      >
        <Input
          id="value"
          name="value"
          type="number"
          step="any"
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </Field>

      <Field
        label="Aankoopprijs / inleg totaal (€, optioneel)"
        htmlFor="purchase_price"
        hint="Voor winst/verlies-berekening. Niet nodig voor cash of pensioen."
      >
        <Input
          id="purchase_price"
          name="purchase_price"
          type="number"
          step="any"
          defaultValue={initial?.purchase_price ?? 0}
        />
      </Field>

      {(rules.sector || rules.geography) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {rules.sector && (
            <Field label="Sector (optioneel)" htmlFor="sector">
              <Input
                id="sector"
                name="sector"
                defaultValue={initial?.sector ?? ''}
                placeholder="Bijv. Technology"
              />
            </Field>
          )}
          {rules.geography && (
            <Field label="Geografie (optioneel)" htmlFor="geography">
              <Input
                id="geography"
                name="geography"
                defaultValue={initial?.geography ?? ''}
                placeholder="Bijv. Global, USA, NL"
              />
            </Field>
          )}
        </div>
      )}
      {!rules.sector && (
        <input type="hidden" name="sector" defaultValue={initial?.sector ?? ''} />
      )}
      {!rules.geography && (
        <input type="hidden" name="geography" defaultValue={initial?.geography ?? ''} />
      )}

      <Field label="Notities (optioneel)" htmlFor="notes">
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={initial?.notes}
          placeholder={getNotesPlaceholder(type)}
          className="flex w-full min-h-16 rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
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

function getNotesPlaceholder(type: AssetType): string {
  switch (type) {
    case 'Cash':
      return 'Bijv. ING Spaarrekening, 1,40% rente';
    case 'Bond':
      return 'Bijv. Coupon 3,5% — looptijd tot 2030';
    case 'Real Estate':
      return 'Adres, oppervlakte, hypotheek-saldo, taxatiedatum';
    case 'Pension':
      return 'Bijv. ABP — opbouwjaar tot 67';
    case 'Vehicle':
      return 'Bouwjaar, kilometerstand, kenteken';
    case 'P2P Lending':
      return 'Platform, gemiddeld rendement, looptijd';
    default:
      return '';
  }
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

const METAL_OPTIONS = [
  { value: 'GOLD', label: 'Goud' },
  { value: 'SILVER', label: 'Zilver' },
  { value: 'PLATINUM', label: 'Platina' },
  { value: 'PALLADIUM', label: 'Palladium' },
] as const;

function PhysicalMetalCalculator({
  onResult,
}: {
  onResult: (gramsPure: string, valueEur: string) => void;
}) {
  const [metal, setMetal] = useState<'GOLD' | 'SILVER' | 'PLATINUM' | 'PALLADIUM'>('GOLD');
  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState<'g' | 'oz' | 'kg'>('g');
  const [purity, setPurity] = useState('99.99');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ value: number; pricePerGram: number } | null>(null);

  async function calculate() {
    setError(null);
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`/api/metal-price/${metal}`);
      if (!res.ok) throw new Error(`Kon prijs niet ophalen (${res.status})`);
      const data = (await res.json()) as { price_eur_per_gram: number };
      const pricePerGram = data.price_eur_per_gram;

      let grams = Number(weight) || 0;
      if (unit === 'oz') grams *= 31.1035;
      if (unit === 'kg') grams *= 1000;
      const pure = grams * (Number(purity) / 100);
      const value = pure * pricePerGram;

      setResult({ value, pricePerGram });
      onResult(pure.toFixed(4), value.toFixed(2));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Onbekende fout');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="size-4" />
          Edelmetaal-calculator
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Vul gewicht en zuiverheid in — wij rekenen het fijngewicht en de actuele waarde uit via spot-prijs.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="metal-type">Metaal</Label>
            <Select value={metal} onValueChange={(v) => v && setMetal(v as typeof metal)}>
              <SelectTrigger id="metal-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                {METAL_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="metal-weight">Gewicht</Label>
            <Input
              id="metal-weight"
              type="number"
              step="any"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="100"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="metal-unit">Eenheid</Label>
            <Select value={unit} onValueChange={(v) => v && setUnit(v as typeof unit)}>
              <SelectTrigger id="metal-unit"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="g">gram</SelectItem>
                <SelectItem value="oz">troy ounce</SelectItem>
                <SelectItem value="kg">kilogram</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="metal-purity">Zuiverheid (%)</Label>
            <Input
              id="metal-purity"
              type="number"
              step="any"
              value={purity}
              onChange={(e) => setPurity(e.target.value)}
              placeholder="99.99"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="button" onClick={calculate} disabled={busy || !weight}>
            {busy ? <Loader2 className="animate-spin" /> : <Calculator />}
            Bereken waarde
          </Button>
          {result && (
            <span className="text-sm text-muted-foreground">
              €{result.pricePerGram.toFixed(2)}/g · totaal €
              {result.value.toLocaleString('nl-NL', { maximumFractionDigits: 2 })}
            </span>
          )}
          {error && <span className="text-sm text-destructive">{error}</span>}
        </div>
        <p className="text-xs text-muted-foreground">
          De berekende waarden worden in de velden hieronder gezet. Pas aan indien gewenst.
        </p>
      </CardContent>
    </Card>
  );
}

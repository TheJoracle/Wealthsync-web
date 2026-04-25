'use client';

import { useMemo, useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { saveBox3Snapshot } from '@/app/tax/actions';
import { calculateBox3 } from '@/lib/box3';
import { Button } from '@/components/ui/button';
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

function fmtEur(n: number): string {
  return `€${n.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`;
}

function fmtPct(n: number, frac = 2): string {
  return `${(n * 100).toFixed(frac)}%`;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR + 1, CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

export function Box3Calculator({ initialWealth }: { initialWealth: number }) {
  const [wealth, setWealth] = useState(String(initialWealth));
  const [year, setYear] = useState(CURRENT_YEAR);
  const [couple, setCouple] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const wealthNum = Number(wealth) || 0;
  const result = useMemo(
    () => calculateBox3(wealthNum, { year, couple }),
    [wealthNum, year, couple],
  );

  function onSaveSnapshot() {
    setError(null);
    setSaved(false);
    const fd = new FormData();
    fd.set('year', String(year));
    fd.set('wealth', String(wealthNum));
    if (couple) fd.set('couple', 'on');
    startTransition(async () => {
      const r = await saveBox3Snapshot(fd);
      if (r?.error) setError(r.error);
      else setSaved(true);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Box 3 Vermogensrendementsheffing</CardTitle>
        <p className="text-sm text-muted-foreground">
          Berekening op basis van fictief rendement (2026 tarieven). Werkelijk-rendement-regime kun je los aangeven via de Belastingdienst.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="box3-year">Belastingjaar</Label>
            <Select value={String(year)} onValueChange={(v) => v && setYear(Number(v))}>
              <SelectTrigger id="box3-year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="box3-wealth">Vermogen op 1 januari (€)</Label>
            <Input
              id="box3-wealth"
              type="number"
              step="any"
              value={wealth}
              onChange={(e) => setWealth(e.target.value)}
            />
            <span className="text-xs text-muted-foreground">
              Auto-ingevuld vanuit huidige portfolio: {fmtEur(initialWealth)}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="box3-couple">Fiscaal partner</Label>
            <label
              htmlFor="box3-couple"
              className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm"
            >
              <input
                id="box3-couple"
                type="checkbox"
                checked={couple}
                onChange={(e) => setCouple(e.target.checked)}
                className="size-4"
              />
              <span className="text-muted-foreground">Verdubbelt vrijstelling tot €114k</span>
            </label>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Vrijstelling" value={fmtEur(result.taxFreeAllowance)} />
          <Stat label="Belastbaar" value={fmtEur(result.taxableWealth)} />
          <Stat
            label="Fictief rendement"
            value={fmtEur(result.deemedReturn)}
            hint={fmtPct(result.deemedReturn / Math.max(1, result.totalWealth))}
          />
          <Stat
            label="Geschatte belasting"
            value={fmtEur(result.estimatedTax)}
            tone="negative"
            hint={`Effectief ${fmtPct(result.effectiveRate, 3)}`}
          />
        </div>

        {result.brackets.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide">Schijf</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide">Bedrag</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide">Percentage</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide">Fictief rend.</th>
                </tr>
              </thead>
              <tbody>
                {result.brackets.map((b) => (
                  <tr key={b.name} className="border-t border-border">
                    <td className="px-4 py-2">{b.name}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtEur(b.amount)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtPct(b.rate)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtEur(b.deemedReturn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button onClick={onSaveSnapshot} disabled={pending} size="lg">
            {pending && <Loader2 className="animate-spin" />}
            Bewaar snapshot voor {year}
          </Button>
          {saved && <span className="text-sm text-primary">Opgeslagen ✓</span>}
          {error && <span className="text-sm text-destructive">{error}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'negative';
}) {
  const color = tone === 'negative' ? 'text-destructive' : 'text-foreground';
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${color}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

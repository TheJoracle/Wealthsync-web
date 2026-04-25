'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { addAlert, deleteAlert, toggleAlert } from '@/app/alerts/actions';
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

type Asset = { id: number; symbol: string; name: string; value: number; amount: number };

type AlertRow = {
  id: number;
  asset_id: number;
  symbol: string;
  target_price: number;
  condition: string;
  is_active: boolean;
  created_at: string;
};

function fmtEur(n: number, frac = 2): string {
  return `€${n.toLocaleString('nl-NL', { minimumFractionDigits: frac, maximumFractionDigits: frac })}`;
}

export function AlertsManager({
  assets,
  alerts,
}: {
  assets: Asset[];
  alerts: AlertRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<number>(assets[0]?.id ?? 0);
  const [target, setTarget] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');

  const selectedAsset = assets.find((a) => a.id === assetId);
  const currentPrice =
    selectedAsset && selectedAsset.amount > 0
      ? selectedAsset.value / selectedAsset.amount
      : 0;

  function onAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const fd = new FormData(event.currentTarget);
    fd.set('asset_id', String(assetId));
    fd.set('condition', condition);
    if (selectedAsset) fd.set('symbol', selectedAsset.symbol);
    startTransition(async () => {
      const r = await addAlert(fd);
      if (r?.error) setError(r.error);
      else router.refresh();
    });
  }

  function onDelete(id: number) {
    if (!confirm('Alert verwijderen?')) return;
    startTransition(async () => {
      await deleteAlert(id);
    });
  }

  function onToggle(id: number, active: boolean) {
    startTransition(async () => {
      await toggleAlert(id, active);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Nieuwe alert</CardTitle>
          <p className="text-sm text-muted-foreground">
            We checken bij elke price-update of de doelprijs is gepasseerd. Notificaties komen later via email.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onAdd} className="grid gap-4 sm:grid-cols-4">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="alert-asset">Asset</Label>
              <Select
                value={String(assetId)}
                onValueChange={(v) => v && setAssetId(Number(v))}
              >
                <SelectTrigger id="alert-asset">
                  <SelectValue placeholder="Kies een asset" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.symbol} — {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentPrice > 0 && (
                <span className="text-xs text-muted-foreground">
                  Huidige prijs ≈ {fmtEur(currentPrice)}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="alert-condition">Conditie</Label>
              <Select
                value={condition}
                onValueChange={(v) => v && setCondition(v as 'above' | 'below')}
              >
                <SelectTrigger id="alert-condition">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="above">Boven</SelectItem>
                  <SelectItem value="below">Onder</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="alert-target">Doelprijs (€)</Label>
              <Input
                id="alert-target"
                type="number"
                step="any"
                name="target_price"
                required
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive sm:col-span-4">
                {error}
              </div>
            )}
            <Button
              type="submit"
              disabled={pending || assets.length === 0}
              size="lg"
              className="sm:col-span-4 sm:max-w-xs"
            >
              {pending ? <Loader2 className="animate-spin" /> : <Plus />}
              Alert toevoegen
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actieve alerts ({alerts.filter((a) => a.is_active).length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {alerts.length === 0 ? (
            <p className="px-6 py-4 text-center text-sm text-muted-foreground">
              Nog geen alerts. Voeg er hierboven een toe.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Symbool</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Conditie</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Doelprijs</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Actief</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{a.symbol}</td>
                    <td className="px-4 py-3">{a.condition === 'above' ? 'Boven' : 'Onder'}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {fmtEur(Number(a.target_price))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={a.is_active}
                        onChange={(e) => onToggle(a.id, e.target.checked)}
                        disabled={pending}
                        className="size-4"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        onClick={() => onDelete(a.id)}
                        disabled={pending}
                        variant="ghost"
                        size="icon-sm"
                        title="Verwijder"
                      >
                        <Trash2 />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { History, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { connectPlatform, disconnectPlatform } from '@/app/connections/actions';
import {
  PLATFORM_FIELDS,
  PLATFORM_LABELS,
  type Platform,
} from '@/app/connections/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type Props = {
  platform: Platform;
  connected: boolean;
  lastSync: string | null;
  lastError: string | null;
};

export function ConnectionCard({ platform, connected, lastSync, lastError }: Props) {
  const label = PLATFORM_LABELS[platform];
  const needsSecret = PLATFORM_FIELDS[platform].needsSecret;

  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await connectPlatform(fd);
      if (result?.error) setError(result.error);
      else {
        setOpen(false);
        setApiKey('');
        setApiSecret('');
      }
    });
  }

  function onDisconnect() {
    startTransition(async () => {
      await disconnectPlatform(platform);
    });
  }

  async function onSync() {
    setError(null);
    setInfo(null);
    setSyncing(true);
    try {
      const res = await fetch(`/api/sync/${platform}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? `Sync failed (${res.status})`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  async function onBackfill() {
    setError(null);
    setInfo(null);
    setBackfilling(true);
    try {
      const res = await fetch(`/api/sync/${platform}/backfill`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `Backfill failed (${res.status})`);
      } else {
        const parts = [
          `${data.inserted} transacties geïmporteerd uit ${data.total} orders`,
          data.skipped ? `${data.skipped} overgeslagen` : null,
        ]
          .filter(Boolean)
          .join(' · ');
        const tail = data.rateLimited
          ? ' — Trading 212 heeft rate-limited, klik na ~1 minuut opnieuw voor de rest.'
          : data.more
            ? ' — Er zijn nog oudere orders, klik nogmaals om verder te gaan.'
            : '';
        setInfo(parts + tail);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Backfill failed');
    } finally {
      setBackfilling(false);
    }
  }

  return (
    <Card>
      <CardContent className="px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">{label}</h3>
            <p className="text-sm text-muted-foreground">
              {connected ? (
                <>
                  <span className="text-primary">●</span> Gekoppeld
                  {lastSync && ` · laatst gesynced ${new Date(lastSync).toLocaleString('nl-NL')}`}
                </>
              ) : (
                <><span className="text-muted-foreground">●</span> Niet gekoppeld</>
              )}
            </p>
            {lastError && (
              <p className="mt-1 text-sm text-destructive">Laatste fout: {lastError}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {connected ? (
              <>
                <Button onClick={onSync} disabled={syncing || pending || backfilling} size="lg">
                  {syncing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                  {syncing ? 'Syncing...' : 'Sync nu'}
                </Button>
                {platform === 'trading212' && (
                  <Button
                    onClick={onBackfill}
                    disabled={syncing || pending || backfilling}
                    variant="outline"
                    size="lg"
                    title="Importeer alle historische orders (eenmalig)"
                  >
                    {backfilling ? <Loader2 className="animate-spin" /> : <History />}
                    {backfilling ? 'Bezig...' : 'Backfill historie'}
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm hover:bg-muted"
                    disabled={pending}
                  >
                    <Trash2 className="size-4" />
                    Loskoppelen
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{label} loskoppelen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Je versleutelde API-key wordt verwijderd. Je kunt later opnieuw koppelen.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuleren</AlertDialogCancel>
                      <AlertDialogAction onClick={onDisconnect}>Loskoppelen</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <Button onClick={() => setOpen(!open)} variant="outline" size="lg">
                {open ? 'Annuleren' : 'Koppelen'}
              </Button>
            )}
          </div>
        </div>

        {open && !connected && (
          <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
            <input type="hidden" name="platform" value={platform} />
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${platform}-key`}>API key</Label>
              <Input
                id={`${platform}-key`}
                name="api_key"
                type="password"
                required
                autoComplete="off"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            {needsSecret && (
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${platform}-secret`}>API secret</Label>
                <Input
                  id={`${platform}-secret`}
                  name="api_secret"
                  type="password"
                  required
                  autoComplete="off"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                />
              </div>
            )}
            {platform === 'trading212' && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  name="mode"
                  value="demo"
                  className="size-4 rounded border-input"
                />
                Practice / demo account
              </label>
            )}
            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <Button type="submit" disabled={pending} className="self-start">
              {pending && <Loader2 className="animate-spin" />}
              Opslaan
            </Button>
            <p className="text-xs text-muted-foreground">
              Je key wordt versleuteld opgeslagen (AES-256-GCM). Alleen de server kan 'm ontsleutelen bij syncs.
            </p>
          </form>
        )}

        {error && connected && (
          <div className="mt-3 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {info && (
          <div className="mt-3 rounded-md border border-primary/50 bg-primary/10 px-4 py-3 text-sm text-primary">
            {info}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

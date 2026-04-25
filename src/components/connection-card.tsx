'use client';

import { useState, useTransition } from 'react';
import { connectPlatform, disconnectPlatform } from '@/app/connections/actions';
import { PLATFORM_FIELDS, PLATFORM_LABELS, type Platform } from '@/app/connections/types';

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
    if (!confirm(`${label} loskoppelen? Je API-key wordt verwijderd.`)) return;
    startTransition(async () => {
      await disconnectPlatform(platform);
    });
  }

  async function onSync() {
    setError(null);
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

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{label}</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            {connected ? (
              <>
                <span className="text-[var(--brand)]">●</span> Gekoppeld
                {lastSync && ` · laatst gesynced ${new Date(lastSync).toLocaleString('nl-NL')}`}
              </>
            ) : (
              <><span className="text-[var(--text-muted)]">●</span> Niet gekoppeld</>
            )}
          </p>
          {lastError && (
            <p className="mt-1 text-sm text-[var(--danger)]">Laatste fout: {lastError}</p>
          )}
        </div>
        <div className="flex gap-2">
          {connected ? (
            <>
              <button
                type="button"
                onClick={onSync}
                disabled={syncing || pending}
                className="rounded-lg bg-gradient-to-r from-[var(--brand)] to-[var(--brand-hover)] px-4 py-2 text-sm font-semibold text-[var(--on-brand)] transition hover:brightness-110 disabled:opacity-50"
              >
                {syncing ? 'Syncing...' : 'Sync nu'}
              </button>
              <button
                type="button"
                onClick={onDisconnect}
                disabled={pending}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:border-[var(--danger)] hover:text-[var(--danger)]"
              >
                Loskoppelen
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-primary)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
            >
              {open ? 'Annuleren' : 'Koppelen'}
            </button>
          )}
        </div>
      </div>

      {open && !connected && (
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3 border-t border-[var(--border)] pt-4">
          <input type="hidden" name="platform" value={platform} />
          <div className="flex flex-col gap-1">
            <label htmlFor={`${platform}-key`} className="text-sm font-medium text-[var(--text-secondary)]">
              API key
            </label>
            <input
              id={`${platform}-key`}
              name="api_key"
              type="password"
              required
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--brand)]"
            />
          </div>
          {needsSecret && (
            <div className="flex flex-col gap-1">
              <label htmlFor={`${platform}-secret`} className="text-sm font-medium text-[var(--text-secondary)]">
                API secret
              </label>
              <input
                id={`${platform}-secret`}
                name="api_secret"
                type="password"
                required
                autoComplete="off"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--brand)]"
              />
            </div>
          )}
          {platform === 'trading212' && (
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input
                type="checkbox"
                name="mode"
                value="demo"
                className="h-4 w-4 rounded border-[var(--border)] bg-[var(--bg-panel)]"
              />
              Practice / demo account
            </label>
          )}
          {error && (
            <div className="rounded-lg border border-[var(--danger)] bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={pending}
            className="self-start rounded-lg bg-gradient-to-r from-[var(--brand)] to-[var(--brand-hover)] px-5 py-2.5 text-sm font-semibold text-[var(--on-brand)] transition hover:brightness-110 disabled:opacity-50"
          >
            {pending ? '...' : 'Opslaan'}
          </button>
          <p className="text-xs text-[var(--text-muted)]">
            Je key wordt versleuteld opgeslagen (AES-256-GCM). Alleen de server kan 'm ontsleutelen bij syncs.
          </p>
        </form>
      )}

      {error && connected && (
        <div className="mt-3 rounded-lg border border-[var(--danger)] bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}
    </div>
  );
}

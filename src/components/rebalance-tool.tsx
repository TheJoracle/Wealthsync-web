'use client';

import { useEffect, useMemo, useState } from 'react';

type AssetSlice = { symbol: string; type: string; value: number };

const TYPES = ['ETF', 'Stock', 'Crypto', 'Commodity', 'Physical Metal'] as const;
type AssetTypeKey = (typeof TYPES)[number];

const STORAGE_KEY = 'wealthsync-rebalance-targets';

function loadTargets(): Record<AssetTypeKey, number> {
  if (typeof window === 'undefined') return defaultTargets();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultTargets();
    const parsed = JSON.parse(raw) as Partial<Record<AssetTypeKey, number>>;
    return TYPES.reduce(
      (acc, t) => {
        acc[t] = Number.isFinite(parsed[t]) ? Number(parsed[t]) : 0;
        return acc;
      },
      {} as Record<AssetTypeKey, number>,
    );
  } catch {
    return defaultTargets();
  }
}

function defaultTargets(): Record<AssetTypeKey, number> {
  return { ETF: 70, Stock: 0, Crypto: 10, Commodity: 10, 'Physical Metal': 10 };
}

function fmtEur(n: number, frac = 0): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}€${Math.round(n).toLocaleString('nl-NL', {
    minimumFractionDigits: frac,
    maximumFractionDigits: frac,
  })}`;
}

export function RebalanceTool({ assets }: { assets: AssetSlice[] }) {
  const [targets, setTargets] = useState<Record<AssetTypeKey, number>>(defaultTargets);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setTargets(loadTargets());
  }, []);

  const total = assets.reduce((s, a) => s + Number(a.value), 0);
  const sumPct = TYPES.reduce((s, t) => s + (Number.isFinite(targets[t]) ? targets[t] : 0), 0);

  const current = useMemo(() => {
    const m: Record<AssetTypeKey, number> = {
      ETF: 0, Stock: 0, Crypto: 0, Commodity: 0, 'Physical Metal': 0,
    };
    for (const a of assets) {
      const t = (TYPES as readonly string[]).includes(a.type)
        ? (a.type as AssetTypeKey)
        : 'Stock';
      m[t] += Number(a.value);
    }
    return m;
  }, [assets]);

  function setTarget(type: AssetTypeKey, value: number) {
    const next = { ...targets, [type]: value };
    setTargets(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  if (assets.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-secondary)]">
        Geen assets om te rebalancen.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Rebalancing</h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Stel je gewenste verdeling in. We laten zien wat je moet bij- of verkopen om er te komen.
          </p>
        </div>
        {saved && <span className="text-xs text-[var(--accent)]">Opgeslagen</span>}
      </div>

      {Math.abs(sumPct - 100) > 0.5 && (
        <div className="mb-4 rounded-lg border border-[var(--warning)] bg-[var(--warning)]/10 px-4 py-2 text-sm text-[var(--warning)]">
          Totaal staat op {sumPct.toFixed(1)}%. Maak er 100% van voor een correcte berekening.
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-panel)] text-[var(--text-secondary)]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Type</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Huidig</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Doel %</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Doelwaarde</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Actie</th>
            </tr>
          </thead>
          <tbody>
            {TYPES.map((type) => {
              const currentValue = current[type];
              const currentPct = total > 0 ? (currentValue / total) * 100 : 0;
              const targetValue = (total * targets[type]) / 100;
              const delta = targetValue - currentValue;
              const action =
                Math.abs(delta) < total * 0.005
                  ? '— op koers'
                  : delta > 0
                    ? `Bijkopen ${fmtEur(delta)}`
                    : `Verkopen ${fmtEur(delta)}`;
              const actionColor =
                Math.abs(delta) < total * 0.005
                  ? 'text-[var(--text-muted)]'
                  : delta > 0
                    ? 'text-[var(--accent)]'
                    : 'text-[var(--danger)]';
              return (
                <tr key={type} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 font-medium">{type}</td>
                  <td className="px-4 py-3 text-right">
                    {fmtEur(currentValue)}{' '}
                    <span className="text-xs text-[var(--text-muted)]">({currentPct.toFixed(1)}%)</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={targets[type]}
                      onChange={(e) => setTarget(type, Number(e.target.value))}
                      className="w-20 rounded border border-[var(--border)] bg-[var(--bg-panel)] px-2 py-1 text-right text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                    />
                  </td>
                  <td className="px-4 py-3 text-right text-[var(--text-secondary)]">
                    {fmtEur(targetValue)}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${actionColor}`}>{action}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-[var(--text-muted)]">
        Doelpercentages worden lokaal in je browser bewaard. Werkt nog niet over apparaten heen — dat kunnen we later naar Supabase verhuizen.
      </p>
    </div>
  );
}

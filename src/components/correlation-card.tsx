'use client';

import { useMemo, useState } from 'react';
import type { Pair } from '@/lib/correlation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function corrColor(c: number): { bg: string; label: string } {
  if (c >= 0.8) return { bg: 'rgba(216, 50, 96, 0.55)', label: 'Sterk gelijk' };
  if (c >= 0.5) return { bg: 'rgba(217, 115, 0, 0.45)', label: 'Gelijk' };
  if (c >= 0.2) return { bg: 'rgba(217, 115, 0, 0.25)', label: 'Licht gelijk' };
  if (c >= -0.2) return { bg: 'rgba(120, 120, 120, 0.18)', label: 'Onafhankelijk' };
  if (c >= -0.5) return { bg: 'rgba(0, 168, 90, 0.25)', label: 'Licht tegen' };
  if (c >= -0.8) return { bg: 'rgba(0, 168, 90, 0.45)', label: 'Tegen' };
  return { bg: 'rgba(0, 168, 90, 0.6)', label: 'Sterk tegen' };
}

export function CorrelationCard({ pairs, symbols }: { pairs: Pair[]; symbols: string[] }) {
  const [view, setView] = useState<'list' | 'matrix'>('list');

  const matrix = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of pairs) {
      map.set(`${p.a}|${p.b}`, p.correlation);
      map.set(`${p.b}|${p.a}`, p.correlation);
    }
    return map;
  }, [pairs]);

  if (pairs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Asset-correlaties</CardTitle>
          <p className="text-sm text-muted-foreground">
            Nog onvoldoende prijsgeschiedenis om correlaties te berekenen. Wacht een week of twee
            tot de cron meer datapunten heeft verzameld.
          </p>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Asset-correlaties</CardTitle>
            <p className="text-sm text-muted-foreground">
              Pearson-correlatie van dagelijkse returns. Sterk-gelijke assets bewegen samen — minder
              spreiding in je portfolio dan je denkt.
            </p>
          </div>
          <div className="flex gap-1 rounded-lg border border-border p-1">
            <button
              type="button"
              onClick={() => setView('list')}
              className={`rounded px-3 py-1 text-sm transition ${
                view === 'list'
                  ? 'bg-muted text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Top-pairs
            </button>
            <button
              type="button"
              onClick={() => setView('matrix')}
              className={`rounded px-3 py-1 text-sm transition ${
                view === 'matrix'
                  ? 'bg-muted text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Matrix
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {view === 'list' ? (
          <div className="flex flex-col divide-y divide-border">
            {pairs.map((p) => {
              const tone = corrColor(p.correlation);
              return (
                <div key={`${p.a}-${p.b}`} className="flex items-center justify-between gap-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="inline-flex h-6 items-center rounded px-2 text-xs font-medium"
                      style={{ background: tone.bg }}
                    >
                      {tone.label}
                    </span>
                    <span className="truncate text-sm">
                      <strong>{p.a}</strong> ↔ <strong>{p.b}</strong>
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 text-right">
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        p.correlation >= 0.5
                          ? 'text-destructive'
                          : p.correlation <= -0.5
                            ? 'text-primary'
                            : 'text-foreground'
                      }`}
                    >
                      {p.correlation >= 0 ? '+' : ''}
                      {p.correlation.toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground">{p.overlap}d</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="text-xs">
              <thead>
                <tr>
                  <th className="px-2 py-1" />
                  {symbols.map((s) => (
                    <th key={s} className="px-2 py-1 text-left text-muted-foreground">
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {symbols.map((row) => (
                  <tr key={row}>
                    <th className="px-2 py-1 text-left text-muted-foreground">{row}</th>
                    {symbols.map((col) => {
                      if (row === col) {
                        return (
                          <td
                            key={col}
                            className="px-2 py-1 tabular-nums"
                            style={{ background: 'rgba(120,120,120,0.2)' }}
                          >
                            1.00
                          </td>
                        );
                      }
                      const c = matrix.get(`${row}|${col}`);
                      if (c === undefined) {
                        return (
                          <td key={col} className="px-2 py-1 text-muted-foreground">
                            —
                          </td>
                        );
                      }
                      return (
                        <td
                          key={col}
                          className="px-2 py-1 tabular-nums"
                          style={{ background: corrColor(c).bg }}
                        >
                          {c >= 0 ? '+' : ''}
                          {c.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

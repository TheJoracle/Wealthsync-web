/**
 * Pairwise Pearson correlation between assets, computed on overlapping daily
 * returns. Two assets that move together every day correlate at +1; perfectly
 * opposite at -1; uncorrelated at 0.
 *
 * Inputs are price points per asset; we align them by date intersection so
 * gaps in one series don't pollute the other's covariance.
 */

export type Series = {
  symbol: string;
  name: string;
  points: { date: string; price: number }[];
};

export type Pair = {
  a: string;
  b: string;
  correlation: number;
  overlap: number; // number of days both series had data
};

function dailyReturnsByDate(points: Series['points']): Map<string, number> {
  const out = new Map<string, number>();
  // Make sure points are sorted ascending
  const sorted = [...points].sort(
    (x, y) => new Date(x.date).getTime() - new Date(y.date).getTime(),
  );
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].price;
    const curr = sorted[i].price;
    if (prev > 0) {
      const date = sorted[i].date.slice(0, 10);
      out.set(date, (curr - prev) / prev);
    }
  }
  return out;
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return 0;
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  let cov = 0;
  let varX = 0;
  let varY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    cov += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }
  if (varX <= 0 || varY <= 0) return 0;
  return cov / Math.sqrt(varX * varY);
}

export function computePairwiseCorrelations(series: Series[]): Pair[] {
  const returns = series.map((s) => ({
    symbol: s.symbol,
    name: s.name,
    daily: dailyReturnsByDate(s.points),
  }));

  const pairs: Pair[] = [];
  for (let i = 0; i < returns.length; i++) {
    for (let j = i + 1; j < returns.length; j++) {
      const a = returns[i];
      const b = returns[j];
      const xs: number[] = [];
      const ys: number[] = [];
      for (const [date, x] of a.daily) {
        const y = b.daily.get(date);
        if (y !== undefined) {
          xs.push(x);
          ys.push(y);
        }
      }
      if (xs.length < 5) continue; // need at least a week of overlap
      pairs.push({
        a: a.symbol,
        b: b.symbol,
        correlation: pearson(xs, ys),
        overlap: xs.length,
      });
    }
  }
  return pairs.sort((a, b) => b.correlation - a.correlation);
}

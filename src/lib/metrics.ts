/**
 * Pure portfolio metrics — computed from a daily history series.
 * Caller selects the period; functions just operate on the array passed in.
 */

export type HistoryPoint = { date: string; total_value: number };

/** Period return: (last - first) / first */
export function periodReturn(points: HistoryPoint[]): number | null {
  if (points.length < 2) return null;
  const first = points[0].total_value;
  const last = points[points.length - 1].total_value;
  if (first === 0) return null;
  return (last - first) / first;
}

/**
 * Max drawdown: largest peak-to-trough decline observed in the series.
 * Returned as a non-positive fraction (e.g. -0.12 = 12% drawdown).
 */
export function maxDrawdown(points: HistoryPoint[]): number {
  let peak = -Infinity;
  let worst = 0;
  for (const p of points) {
    if (p.total_value > peak) peak = p.total_value;
    if (peak <= 0) continue;
    const dd = (p.total_value - peak) / peak;
    if (dd < worst) worst = dd;
  }
  return worst;
}

/**
 * Annualized volatility from daily returns.
 * Assumes ~252 trading days per year (standard finance convention).
 */
export function annualizedVolatility(points: HistoryPoint[]): number | null {
  if (points.length < 3) return null;
  const returns: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1].total_value;
    const b = points[i].total_value;
    if (a > 0) returns.push((b - a) / a);
  }
  if (returns.length < 2) return null;
  const mean = returns.reduce((s, x) => s + x, 0) / returns.length;
  const variance =
    returns.reduce((s, x) => s + (x - mean) ** 2, 0) / (returns.length - 1);
  const stdev = Math.sqrt(variance);
  return stdev * Math.sqrt(252);
}

/**
 * Total return on cost basis (current value vs total invested).
 * Returns null if total invested is 0 (e.g. no cost data yet).
 */
export function totalReturnOnCost(
  currentValue: number,
  totalInvested: number,
): number | null {
  if (totalInvested <= 0) return null;
  return (currentValue - totalInvested) / totalInvested;
}

/**
 * Time-weighted return — neutralises the effect of deposits and withdrawals,
 * which is the standard way brokers compute their headline rendement %.
 *
 *   r_t = (V_t - cashflow_t) / V_{t-1}
 *   TWR = ∏ (1 + r_t) - 1
 *
 * `cashflowsByDate` should be net external flow per day (deposits positive,
 * withdrawals negative). Trades within the portfolio (asset-to-asset) are
 * NOT cash flows — they don't change invested capital.
 */
export function timeWeightedReturn(
  points: HistoryPoint[],
  cashflowsByDate: Map<string, number>,
): number | null {
  if (points.length < 2) return null;
  let cumulative = 1;
  let any = false;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1].total_value;
    const curr = points[i].total_value;
    if (prev <= 0) continue;
    const cf = cashflowsByDate.get(points[i].date) ?? 0;
    const adjusted = curr - cf;
    if (adjusted <= 0) continue;
    cumulative *= adjusted / prev;
    any = true;
  }
  return any ? cumulative - 1 : null;
}

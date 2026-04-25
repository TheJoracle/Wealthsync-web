/**
 * Herfindahl-Hirschman Index (HHI) for portfolio concentration.
 *
 * HHI = Σ (share_i)^2 × 10000, where share_i is each asset's fraction of total.
 *
 * Conventional bands (used by competition authorities, adapted for portfolios):
 *   < 1500:        Goed gespreid
 *   1500 - 2500:   Gematigd geconcentreerd
 *   > 2500:        Sterk geconcentreerd
 */
export type Concentration = {
  hhi: number;
  rating: 'spread' | 'moderate' | 'concentrated';
  ratingLabel: string;
  topShare: number;
  effectiveCount: number; // 10000 / HHI = "equivalent number of equal-weight holdings"
};

export function computeConcentration(values: number[]): Concentration | null {
  const total = values.reduce((s, v) => s + Math.max(0, v), 0);
  if (total <= 0 || values.length === 0) return null;

  const shares = values.map((v) => Math.max(0, v) / total);
  const hhi = shares.reduce((s, x) => s + x * x, 0) * 10_000;
  const topShare = Math.max(...shares);
  const effectiveCount = hhi > 0 ? 10_000 / hhi : 0;

  let rating: Concentration['rating'];
  let ratingLabel: string;
  if (hhi < 1500) {
    rating = 'spread';
    ratingLabel = 'Goed gespreid';
  } else if (hhi < 2500) {
    rating = 'moderate';
    ratingLabel = 'Gematigd geconcentreerd';
  } else {
    rating = 'concentrated';
    ratingLabel = 'Sterk geconcentreerd';
  }

  return { hhi, rating, ratingLabel, topShare, effectiveCount };
}

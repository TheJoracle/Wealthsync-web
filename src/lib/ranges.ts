/** Shared period filters used by chart + performance metrics. */

export type Range = {
  label: string;
  getCutoff: () => number;
};

const day = 86_400_000;

export const RANGES: readonly Range[] = [
  { label: '1d', getCutoff: () => Date.now() - 1 * day },
  { label: '1w', getCutoff: () => Date.now() - 7 * day },
  { label: '1m', getCutoff: () => Date.now() - 30 * day },
  { label: '3m', getCutoff: () => Date.now() - 90 * day },
  { label: '6m', getCutoff: () => Date.now() - 180 * day },
  { label: '1y', getCutoff: () => Date.now() - 365 * day },
  {
    label: 'YTD',
    getCutoff: () => new Date(new Date().getFullYear(), 0, 1).getTime(),
  },
  { label: 'All', getCutoff: () => Number.NEGATIVE_INFINITY },
];

/** Default index ('1m') — sane starting view for most dashboards. */
export const DEFAULT_RANGE_INDEX = 2;

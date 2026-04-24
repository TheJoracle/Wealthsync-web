export const ASSET_TYPES = [
  'Stock',
  'ETF',
  'Crypto',
  'Commodity',
  'Physical Metal',
] as const;

export type AssetType = (typeof ASSET_TYPES)[number];

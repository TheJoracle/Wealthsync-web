export const PLATFORMS = ['trading212', 'bitvavo'] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
  trading212: 'Trading 212',
  bitvavo: 'Bitvavo',
};

export const PLATFORM_FIELDS: Record<Platform, { needsSecret: boolean }> = {
  trading212: { needsSecret: false },
  bitvavo: { needsSecret: true },
};

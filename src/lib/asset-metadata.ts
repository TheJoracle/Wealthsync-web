/**
 * Three-layer ticker metadata lookup:
 *   1. Curated map (top NL/EU retail tickers) — instant, free
 *   2. Cache table `ticker_classifications` (shared across all users)
 *   3. External API fallback (Yahoo summaryProfile, optionally Twelve Data)
 *
 * Layer 2 is the long-term economic win: every unique ticker hits the API
 * at most once across the entire user base. Cached results never expire
 * (sectors don't change).
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type AssetMeta = {
  name?: string;
  sector?: string;
  geography?: string;
  type?: string; // 'ETF' | 'Stock' | 'Crypto' | 'Commodity' | 'Physical Metal'
};

/**
 * Strip Trading 212's distribution-class suffix when matching against
 * exchange-level lookups (VWCED → VWCE, XLKSM → XLKS).
 */
function baseTicker(symbol: string): string {
  return symbol.toUpperCase().replace(/[ADEM]$/, '');
}

const CURATED: Record<string, AssetMeta> = {
  // Crypto
  BTC: { name: 'Bitcoin', sector: 'Cryptocurrency', geography: 'Gedecentraliseerd', type: 'Crypto' },
  ETH: { name: 'Ethereum', sector: 'Cryptocurrency', geography: 'Gedecentraliseerd', type: 'Crypto' },
  ADA: { name: 'Cardano', sector: 'Cryptocurrency', geography: 'Gedecentraliseerd', type: 'Crypto' },
  SOL: { name: 'Solana', sector: 'Cryptocurrency', geography: 'Gedecentraliseerd', type: 'Crypto' },
  DOT: { name: 'Polkadot', sector: 'Cryptocurrency', geography: 'Gedecentraliseerd', type: 'Crypto' },
  XRP: { name: 'XRP', sector: 'Cryptocurrency', geography: 'Gedecentraliseerd', type: 'Crypto' },
  DOGE: { name: 'Dogecoin', sector: 'Cryptocurrency', geography: 'Gedecentraliseerd', type: 'Crypto' },

  // Diversified ETFs (broad-market)
  VWCE: { name: 'Vanguard FTSE All-World UCITS ETF', sector: 'Diversified', geography: 'Global', type: 'ETF' },
  VWRL: { name: 'Vanguard FTSE All-World UCITS ETF (Distr.)', sector: 'Diversified', geography: 'Global', type: 'ETF' },
  IWDA: { name: 'iShares Core MSCI World UCITS ETF', sector: 'Diversified', geography: 'Developed markets', type: 'ETF' },
  EUNL: { name: 'iShares Core MSCI World UCITS ETF', sector: 'Diversified', geography: 'Developed markets', type: 'ETF' },
  VEVE: { name: 'Vanguard FTSE Developed World UCITS ETF', sector: 'Diversified', geography: 'Developed markets', type: 'ETF' },
  VGWE: { name: 'Vanguard FTSE Developed World UCITS ETF', sector: 'Diversified', geography: 'Developed markets', type: 'ETF' },
  EUNK: { name: 'iShares Core MSCI EM IMI UCITS ETF', sector: 'Diversified', geography: 'Emerging markets', type: 'ETF' },
  EMIM: { name: 'iShares Core MSCI EM IMI UCITS ETF', sector: 'Diversified', geography: 'Emerging markets', type: 'ETF' },
  AYEM: { name: 'Amundi Index MSCI Emerging Markets', sector: 'Diversified', geography: 'Emerging markets', type: 'ETF' },
  VTI: { name: 'Vanguard Total Stock Market ETF', sector: 'Diversified', geography: 'USA', type: 'ETF' },
  VOO: { name: 'Vanguard S&P 500 ETF', sector: 'Diversified', geography: 'USA', type: 'ETF' },
  SPY: { name: 'SPDR S&P 500 ETF', sector: 'Diversified', geography: 'USA', type: 'ETF' },
  CSPX: { name: 'iShares Core S&P 500 UCITS ETF', sector: 'Diversified', geography: 'USA', type: 'ETF' },
  SXR8: { name: 'iShares Core S&P 500 UCITS ETF', sector: 'Diversified', geography: 'USA', type: 'ETF' },
  VUSA: { name: 'Vanguard S&P 500 UCITS ETF', sector: 'Diversified', geography: 'USA', type: 'ETF' },
  IUSA: { name: 'iShares S&P 500 UCITS ETF', sector: 'Diversified', geography: 'USA', type: 'ETF' },

  // Sector-specific ETFs
  XLKS: { name: 'iShares S&P 500 Information Technology Sector', sector: 'Technology', geography: 'USA', type: 'ETF' },
  EQQQ: { name: 'Invesco EQQQ NASDAQ-100 UCITS ETF', sector: 'Technology', geography: 'USA', type: 'ETF' },
  CNDX: { name: 'iShares NASDAQ 100 UCITS ETF', sector: 'Technology', geography: 'USA', type: 'ETF' },
  QUTM: { name: 'L&G Quantum Computing UCITS ETF', sector: 'Technology', geography: 'Global', type: 'ETF' },
  NUKL: { name: 'VanEck Uranium and Nuclear Technologies', sector: 'Energy', geography: 'Global', type: 'ETF' },
  XLE: { name: 'Energy Select Sector SPDR Fund', sector: 'Energy', geography: 'USA', type: 'ETF' },
  XLF: { name: 'Financial Select Sector SPDR Fund', sector: 'Financials', geography: 'USA', type: 'ETF' },
  XLV: { name: 'Health Care Select Sector SPDR Fund', sector: 'Healthcare', geography: 'USA', type: 'ETF' },
  XLI: { name: 'Industrial Select Sector SPDR Fund', sector: 'Industrials', geography: 'USA', type: 'ETF' },
  XLP: { name: 'Consumer Staples Select Sector SPDR', sector: 'Consumer Staples', geography: 'USA', type: 'ETF' },
  XLY: { name: 'Consumer Discretionary Select Sector SPDR', sector: 'Consumer Discretionary', geography: 'USA', type: 'ETF' },
  XLU: { name: 'Utilities Select Sector SPDR Fund', sector: 'Utilities', geography: 'USA', type: 'ETF' },
  XLB: { name: 'Materials Select Sector SPDR Fund', sector: 'Materials', geography: 'USA', type: 'ETF' },
  XLRE: { name: 'Real Estate Select Sector SPDR', sector: 'Real Estate', geography: 'USA', type: 'ETF' },

  // Physical-metal ETCs
  WGLD: { name: 'WisdomTree Physical Gold', sector: 'Edelmetalen', geography: 'Fysiek', type: 'Commodity' },
  WSLV: { name: 'WisdomTree Physical Silver', sector: 'Edelmetalen', geography: 'Fysiek', type: 'Commodity' },
  WPLT: { name: 'WisdomTree Physical Platinum', sector: 'Edelmetalen', geography: 'Fysiek', type: 'Commodity' },
  WPAL: { name: 'WisdomTree Physical Palladium', sector: 'Edelmetalen', geography: 'Fysiek', type: 'Commodity' },
  SGLN: { name: 'iShares Physical Gold ETC', sector: 'Edelmetalen', geography: 'Fysiek', type: 'Commodity' },
  PHGP: { name: 'WisdomTree Physical Gold', sector: 'Edelmetalen', geography: 'Fysiek', type: 'Commodity' },
  GOLD: { name: 'Goud', sector: 'Edelmetalen', geography: 'Fysiek', type: 'Physical Metal' },
  SILVER: { name: 'Zilver', sector: 'Edelmetalen', geography: 'Fysiek', type: 'Physical Metal' },

  // Major US large-caps (handful — extend as needed)
  AAPL: { name: 'Apple Inc.', sector: 'Technology', geography: 'USA', type: 'Stock' },
  MSFT: { name: 'Microsoft Corporation', sector: 'Technology', geography: 'USA', type: 'Stock' },
  GOOGL: { name: 'Alphabet Inc. (Class A)', sector: 'Technology', geography: 'USA', type: 'Stock' },
  GOOG: { name: 'Alphabet Inc. (Class C)', sector: 'Technology', geography: 'USA', type: 'Stock' },
  AMZN: { name: 'Amazon.com Inc.', sector: 'Consumer Discretionary', geography: 'USA', type: 'Stock' },
  TSLA: { name: 'Tesla Inc.', sector: 'Consumer Discretionary', geography: 'USA', type: 'Stock' },
  NVDA: { name: 'NVIDIA Corporation', sector: 'Technology', geography: 'USA', type: 'Stock' },
  META: { name: 'Meta Platforms Inc.', sector: 'Technology', geography: 'USA', type: 'Stock' },
  ASML: { name: 'ASML Holding N.V.', sector: 'Technology', geography: 'Netherlands', type: 'Stock' },
};

function lookupCurated(symbol: string): AssetMeta | null {
  const upper = symbol.toUpperCase();
  return CURATED[upper] ?? CURATED[baseTicker(symbol)] ?? null;
}

async function lookupCache(
  supabase: SupabaseClient,
  symbol: string,
): Promise<AssetMeta | null> {
  const { data } = await supabase
    .from('ticker_classifications')
    .select('name, sector, geography, asset_type')
    .eq('symbol', symbol.toUpperCase())
    .limit(1)
    .single();
  if (!data) return null;
  return {
    name: data.name ?? undefined,
    sector: data.sector ?? undefined,
    geography: data.geography ?? undefined,
    type: data.asset_type ?? undefined,
  };
}

async function writeCache(
  supabase: SupabaseClient,
  symbol: string,
  meta: AssetMeta,
  source: 'yahoo' | 'twelvedata' | 'manual',
): Promise<void> {
  await supabase.from('ticker_classifications').upsert(
    {
      symbol: symbol.toUpperCase(),
      name: meta.name ?? null,
      sector: meta.sector ?? null,
      geography: meta.geography ?? null,
      asset_type: meta.type ?? null,
      source,
      cached_at: new Date().toISOString(),
    },
    { onConflict: 'symbol' },
  );
}

/** Yahoo Finance summary profile — best-effort, often rate-limited from cloud. */
async function lookupYahoo(symbol: string): Promise<AssetMeta | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=summaryProfile,quoteType`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        cache: 'no-store',
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      quoteSummary?: {
        result?: Array<{
          summaryProfile?: { sector?: string; country?: string; longBusinessSummary?: string };
          quoteType?: { longName?: string; quoteType?: string };
        }>;
      };
    };
    const result = data.quoteSummary?.result?.[0];
    if (!result) return null;
    const profile = result.summaryProfile;
    const quote = result.quoteType;
    const out: AssetMeta = {};
    if (quote?.longName) out.name = quote.longName;
    if (profile?.sector) out.sector = profile.sector;
    if (profile?.country) out.geography = profile.country;
    if (quote?.quoteType === 'ETF') out.type = 'ETF';
    else if (quote?.quoteType === 'EQUITY') out.type = 'Stock';
    return out;
  } catch {
    return null;
  }
}

/**
 * Resolve metadata for a ticker. Order: curated → cache → external API.
 * Caches successful API hits for the next caller.
 */
export async function enrichTicker(
  supabase: SupabaseClient,
  symbol: string,
): Promise<AssetMeta> {
  const upper = symbol.toUpperCase();
  const curated = lookupCurated(upper);
  if (curated) return curated;

  const cached = await lookupCache(supabase, upper);
  if (cached) return cached;

  const fromYahoo = await lookupYahoo(upper);
  if (fromYahoo && (fromYahoo.sector || fromYahoo.name)) {
    await writeCache(supabase, upper, fromYahoo, 'yahoo');
    return fromYahoo;
  }

  return {};
}

/** Apply enrichment only to fields that are still empty/null on the asset. */
export function mergeMissing<T extends Record<string, unknown>>(
  current: T,
  patch: AssetMeta,
): Partial<T> {
  const out: Record<string, unknown> = {};
  if (!current.name && patch.name) out.name = patch.name;
  if (!current.sector && patch.sector) out.sector = patch.sector;
  if (!current.geography && patch.geography) out.geography = patch.geography;
  if (!current.type && patch.type) out.type = patch.type;
  return out as Partial<T>;
}

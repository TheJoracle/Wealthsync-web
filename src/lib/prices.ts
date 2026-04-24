/**
 * Price fetchers per asset type.
 * All prices returned in EUR per unit (per share for stocks/ETFs, per coin for crypto,
 * per gram for physical metals).
 */

const CRYPTO_MAP: Record<string, string> = {
  BTC: 'bitcoin',
  BITCOIN: 'bitcoin',
  ETH: 'ethereum',
  ETHEREUM: 'ethereum',
  ADA: 'cardano',
  DOT: 'polkadot',
  SOL: 'solana',
  XRP: 'ripple',
  DOGE: 'dogecoin',
  MATIC: 'matic-network',
};

const METAL_MAP: Record<string, string> = {
  GOLD: 'XAU',
  SILVER: 'XAG',
  PLATINUM: 'XPT',
  PALLADIUM: 'XPD',
};

const TROY_OZ_GRAMS = 31.1035;

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'User-Agent': 'WealthSync/1.0',
      ...init?.headers,
    },
    // Cron runs on cold containers; never cache in Next.js fetch layer
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`${url} returned ${res.status}`);
  }
  return res.json();
}

export async function fetchCryptoPrice(symbol: string): Promise<number | null> {
  const coinId = CRYPTO_MAP[symbol.toUpperCase()] ?? symbol.toLowerCase();
  try {
    const data = (await fetchJson(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=eur`,
    )) as Record<string, { eur: number }>;
    return data[coinId]?.eur ?? null;
  } catch {
    return null;
  }
}

/**
 * Yahoo Finance is aggressively rate-limited from cloud IPs.
 * We treat a rate-limit as "no update" and keep the existing DB value.
 */
export async function fetchStockPrice(symbol: string): Promise<number | null> {
  try {
    const data = (await fetchJson(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
    )) as {
      chart?: { result?: { meta?: { regularMarketPrice?: number; currency?: string } }[] };
    };
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;
    const price = meta.regularMarketPrice;
    const currency = meta.currency ?? 'USD';
    if (currency === 'EUR') return price;
    return await convertToEur(price, currency);
  } catch {
    return null;
  }
}

export async function fetchPhysicalMetalPricePerGram(
  metalType: string,
): Promise<number | null> {
  const symbol = METAL_MAP[metalType.toUpperCase()];
  if (!symbol) return null;
  try {
    const data = (await fetchJson(`https://api.gold-api.com/price/${symbol}`)) as {
      price: number;
    };
    if (!data.price) return null;
    const eurPerOz = await convertToEur(data.price, 'USD');
    if (eurPerOz === null) return null;
    return eurPerOz / TROY_OZ_GRAMS;
  } catch {
    return null;
  }
}

const FALLBACK_FX: Record<string, number> = {
  USD: 0.92,
  GBP: 1.17,
  JPY: 0.0062,
  CHF: 1.05,
};

export async function convertToEur(
  amount: number,
  fromCurrency: string,
): Promise<number | null> {
  if (fromCurrency === 'EUR') return amount;
  try {
    const data = (await fetchJson(
      `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`,
    )) as { rates?: Record<string, number> };
    const rate = data.rates?.EUR;
    if (!rate) throw new Error('no EUR rate');
    return amount * rate;
  } catch {
    const fallback = FALLBACK_FX[fromCurrency];
    return fallback ? amount * fallback : null;
  }
}

/**
 * Fetch the current price-per-unit for an asset, in EUR.
 * Returns null if no reliable source could provide a price.
 */
export async function fetchPriceForAsset(asset: {
  symbol: string;
  type: string;
}): Promise<number | null> {
  const type = asset.type.toLowerCase();
  if (type === 'crypto') return fetchCryptoPrice(asset.symbol);
  if (type === 'physical metal') return fetchPhysicalMetalPricePerGram(asset.symbol);
  // Stocks, ETFs, commodities (ETCs) all go through Yahoo
  return fetchStockPrice(asset.symbol);
}

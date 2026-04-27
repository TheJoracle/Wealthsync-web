export const ASSET_TYPES = [
  'Stock',
  'ETF',
  'Crypto',
  'Commodity',
  'Physical Metal',
  'Cash',
  'Bond',
  'Real Estate',
  'Pension',
  'Vehicle',
  'P2P Lending',
  'Other',
] as const;

export type AssetType = (typeof ASSET_TYPES)[number];

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  Stock: 'Aandeel',
  ETF: 'ETF',
  Crypto: 'Crypto',
  Commodity: 'Commodity (ETC)',
  'Physical Metal': 'Fysiek edelmetaal',
  Cash: 'Spaargeld / Cash',
  Bond: 'Obligatie',
  'Real Estate': 'Vastgoed',
  Pension: 'Pensioen',
  Vehicle: 'Voertuig',
  'P2P Lending': 'P2P-lening',
  Other: 'Overig',
};

/**
 * Per asset-type: which input fields are relevant?
 *   'required'  — show + must fill
 *   'optional'  — show, may leave empty
 *   'hidden'    — don't show, fall back to a sensible default at submit time
 */
type FieldMode = 'required' | 'optional' | 'hidden';

type TypeRules = {
  symbol: FieldMode;
  symbolLabel: string;
  amount: FieldMode;
  amountLabel: string;
  sector: boolean;
  geography: boolean;
  metalCalc?: true;
};

export const FIELD_RULES: Record<AssetType, TypeRules> = {
  Stock: {
    symbol: 'required', symbolLabel: 'Ticker',
    amount: 'required', amountLabel: 'Aantal aandelen',
    sector: true, geography: true,
  },
  ETF: {
    symbol: 'required', symbolLabel: 'Ticker',
    amount: 'required', amountLabel: 'Aantal stukken',
    sector: true, geography: true,
  },
  Crypto: {
    symbol: 'required', symbolLabel: 'Ticker (BTC, ETH, ...)',
    amount: 'required', amountLabel: 'Aantal coins',
    sector: false, geography: false,
  },
  Commodity: {
    symbol: 'required', symbolLabel: 'Ticker',
    amount: 'required', amountLabel: 'Aantal stukken',
    sector: false, geography: false,
  },
  'Physical Metal': {
    symbol: 'optional', symbolLabel: 'Symbool (GOLD, SILVER, PLATINUM, PALLADIUM)',
    amount: 'required', amountLabel: 'Gewicht (gram, fijngewicht)',
    sector: false, geography: false,
    metalCalc: true,
  },
  Cash: {
    symbol: 'hidden', symbolLabel: '',
    amount: 'hidden', amountLabel: '',
    sector: false, geography: false,
  },
  Bond: {
    symbol: 'optional', symbolLabel: 'ISIN of Ticker',
    amount: 'optional', amountLabel: 'Nominale waarde',
    sector: true, geography: true,
  },
  'Real Estate': {
    symbol: 'hidden', symbolLabel: '',
    amount: 'hidden', amountLabel: '',
    sector: false, geography: true,
  },
  Pension: {
    symbol: 'hidden', symbolLabel: '',
    amount: 'hidden', amountLabel: '',
    sector: false, geography: false,
  },
  Vehicle: {
    symbol: 'hidden', symbolLabel: '',
    amount: 'hidden', amountLabel: '',
    sector: false, geography: false,
  },
  'P2P Lending': {
    symbol: 'optional', symbolLabel: 'Platform/Lening-ID',
    amount: 'optional', amountLabel: 'Geïnvesteerd bedrag',
    sector: false, geography: false,
  },
  Other: {
    symbol: 'optional', symbolLabel: 'Symbool / Code (optioneel)',
    amount: 'optional', amountLabel: 'Aantal',
    sector: false, geography: false,
  },
};

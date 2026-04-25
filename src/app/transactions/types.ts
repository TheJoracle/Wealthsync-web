export const TRANSACTION_TYPES = [
  'buy',
  'sell',
  'dividend',
  'deposit',
  'withdrawal',
  'fee',
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  buy: 'Aankoop',
  sell: 'Verkoop',
  dividend: 'Dividend',
  deposit: 'Storting',
  withdrawal: 'Opname',
  fee: 'Kosten',
};

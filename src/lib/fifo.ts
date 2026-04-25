/**
 * FIFO realized gain/loss calculation for transactions.
 *
 * NL tax purposes use FIFO ("eerste in, eerste uit"). For each sell, we deduct
 * lots from the oldest buy first, computing realized gain as
 *   (sell_price - lot_buy_price) × matched_qty
 * Remaining open lots represent the user's current cost basis.
 */

export type Transaction = {
  id: number;
  type: string; // 'buy' | 'sell' | 'dividend' | 'deposit' | 'withdrawal' | ...
  symbol: string | null;
  quantity: number | null;
  price_per_unit: number | null;
  total_value: number;
  fees: number | null;
  transaction_date: string; // ISO date or timestamp
};

export type RealizedSale = {
  symbol: string;
  date: string;
  quantity: number;
  sellPrice: number;
  costBasis: number;
  realized: number;
};

export type OpenPosition = {
  symbol: string;
  quantity: number;
  costBasis: number; // total EUR cost still on the books
  averagePrice: number; // costBasis / quantity
};

export type FifoResult = {
  sales: RealizedSale[];
  totalRealized: number;
  totalSoldValue: number;
  openPositions: OpenPosition[];
};

export function computeFifoRealized(transactions: Transaction[]): FifoResult {
  const bySymbol = new Map<string, Transaction[]>();
  for (const t of transactions) {
    if (!t.symbol) continue;
    const arr = bySymbol.get(t.symbol) ?? [];
    arr.push(t);
    bySymbol.set(t.symbol, arr);
  }

  const sales: RealizedSale[] = [];
  const openPositions: OpenPosition[] = [];

  for (const [symbol, txs] of bySymbol) {
    txs.sort(
      (a, b) =>
        new Date(a.transaction_date).getTime() -
        new Date(b.transaction_date).getTime(),
    );

    type Lot = { qty: number; price: number };
    const lots: Lot[] = [];

    for (const t of txs) {
      const type = t.type.toLowerCase();
      const qty = Number(t.quantity ?? 0);
      const price = Number(t.price_per_unit ?? 0);
      if (qty <= 0) continue;

      if (type === 'buy' || type === 'deposit') {
        lots.push({ qty, price });
        continue;
      }
      if (type !== 'sell' && type !== 'withdrawal') continue;

      let remaining = qty;
      let costBasis = 0;
      while (remaining > 0 && lots.length > 0) {
        const lot = lots[0];
        if (lot.qty <= remaining) {
          costBasis += lot.qty * lot.price;
          remaining -= lot.qty;
          lots.shift();
        } else {
          costBasis += remaining * lot.price;
          lot.qty -= remaining;
          remaining = 0;
        }
      }
      const matchedQty = qty - remaining;
      const sellValue = matchedQty * price;
      const realized = sellValue - costBasis;
      sales.push({
        symbol,
        date: t.transaction_date,
        quantity: matchedQty,
        sellPrice: price,
        costBasis,
        realized,
      });
    }

    // Anything still in `lots` is currently held — collapse into an open position.
    if (lots.length > 0) {
      const totalQty = lots.reduce((s, l) => s + l.qty, 0);
      const totalCost = lots.reduce((s, l) => s + l.qty * l.price, 0);
      openPositions.push({
        symbol,
        quantity: totalQty,
        costBasis: totalCost,
        averagePrice: totalQty > 0 ? totalCost / totalQty : 0,
      });
    }
  }

  sales.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const totalRealized = sales.reduce((s, r) => s + r.realized, 0);
  const totalSoldValue = sales.reduce(
    (s, r) => s + r.quantity * r.sellPrice,
    0,
  );

  return { sales, totalRealized, totalSoldValue, openPositions };
}

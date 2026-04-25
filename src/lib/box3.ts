/**
 * Dutch Box 3 vermogensrendementsheffing.
 *
 * 2026 parameters (update annually when the Dutch government publishes new rates):
 *   tax-free allowance: €57,000 per person (€114,000 for couples filing jointly)
 *   bracket 1 (€57k–€114k):   6.04% deemed return
 *   bracket 2 (€114k–€1.1M):  6.17% deemed return
 *   bracket 3 (€1.1M+):       6.35% deemed return
 *   tax rate on deemed return: 36%
 *
 * Note: This is the simplified single-rate model. The "werkelijk rendement"
 * (actual return) regime that started phasing in does not change these formulas
 * for users who choose the deemed-return path.
 */

const TAX_FREE_ALLOWANCE = 57_000;
const BRACKET1_LIMIT = 114_000;
const BRACKET2_LIMIT = 1_100_000;
const BRACKET1_RATE = 0.0604;
const BRACKET2_RATE = 0.0617;
const BRACKET3_RATE = 0.0635;
const TAX_RATE = 0.36;

export type Box3Bracket = {
  name: string;
  amount: number;
  rate: number;
  deemedReturn: number;
};

export type Box3Result = {
  year: number;
  totalWealth: number;
  taxFreeAllowance: number;
  taxableWealth: number;
  deemedReturn: number;
  estimatedTax: number;
  effectiveRate: number;
  brackets: Box3Bracket[];
};

export function calculateBox3(
  wealth: number,
  options: { year?: number; couple?: boolean } = {},
): Box3Result {
  const year = options.year ?? new Date().getFullYear();
  const taxFreeAllowance = options.couple
    ? TAX_FREE_ALLOWANCE * 2
    : TAX_FREE_ALLOWANCE;

  const taxableWealth = Math.max(0, wealth - taxFreeAllowance);
  const brackets: Box3Bracket[] = [];
  let deemedReturn = 0;

  if (taxableWealth > 0) {
    const amt = Math.min(taxableWealth, BRACKET1_LIMIT - taxFreeAllowance);
    const ret = amt * BRACKET1_RATE;
    deemedReturn += ret;
    brackets.push({
      name: `Schijf 1 (€${formatThousands(taxFreeAllowance)}–€${formatThousands(BRACKET1_LIMIT)})`,
      amount: amt,
      rate: BRACKET1_RATE,
      deemedReturn: ret,
    });
  }

  if (taxableWealth > BRACKET1_LIMIT - taxFreeAllowance) {
    const amt = Math.min(
      taxableWealth - (BRACKET1_LIMIT - taxFreeAllowance),
      BRACKET2_LIMIT - BRACKET1_LIMIT,
    );
    const ret = amt * BRACKET2_RATE;
    deemedReturn += ret;
    brackets.push({
      name: `Schijf 2 (€${formatThousands(BRACKET1_LIMIT)}–€${formatThousands(BRACKET2_LIMIT)})`,
      amount: amt,
      rate: BRACKET2_RATE,
      deemedReturn: ret,
    });
  }

  if (taxableWealth > BRACKET2_LIMIT - taxFreeAllowance) {
    const amt = taxableWealth - (BRACKET2_LIMIT - taxFreeAllowance);
    const ret = amt * BRACKET3_RATE;
    deemedReturn += ret;
    brackets.push({
      name: `Schijf 3 (€${formatThousands(BRACKET2_LIMIT)}+)`,
      amount: amt,
      rate: BRACKET3_RATE,
      deemedReturn: ret,
    });
  }

  const estimatedTax = deemedReturn * TAX_RATE;
  const effectiveRate = wealth > 0 ? estimatedTax / wealth : 0;

  return {
    year,
    totalWealth: wealth,
    taxFreeAllowance,
    taxableWealth,
    deemedReturn,
    estimatedTax,
    effectiveRate,
    brackets,
  };
}

function formatThousands(n: number): string {
  return n.toLocaleString('nl-NL', { maximumFractionDigits: 0 });
}

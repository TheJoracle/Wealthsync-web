/**
 * Retirement projections.
 *
 * Forward: given monthly contribution + return rate, project ending balance
 * at retirement age. Reverse: given a target ending balance, solve for the
 * required monthly contribution.
 *
 * Compounding is monthly with rate r = annualReturn / 12. Inflation can be
 * baked into `annualReturn` by passing the *real* return (e.g. 7% – 2% = 5%).
 */

export type ForwardInput = {
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  monthlyContribution: number;
  annualReturn: number; // 0.07 for 7%
};

export type ForwardResult = {
  totalMonths: number;
  endingBalance: number;
  totalContributed: number;
  totalGrowth: number;
  yearByYear: { age: number; balance: number; contributed: number }[];
};

export function projectForward(input: ForwardInput): ForwardResult | null {
  if (
    !Number.isFinite(input.currentAge) ||
    !Number.isFinite(input.retirementAge) ||
    input.retirementAge <= input.currentAge
  ) {
    return null;
  }

  const months = (input.retirementAge - input.currentAge) * 12;
  const r = input.annualReturn / 12;
  let balance = input.currentSavings;
  let contributed = input.currentSavings;
  const yearByYear: { age: number; balance: number; contributed: number }[] = [
    { age: input.currentAge, balance, contributed },
  ];

  for (let m = 1; m <= months; m++) {
    balance = balance * (1 + r) + input.monthlyContribution;
    contributed += input.monthlyContribution;
    if (m % 12 === 0) {
      yearByYear.push({
        age: input.currentAge + m / 12,
        balance,
        contributed,
      });
    }
  }

  return {
    totalMonths: months,
    endingBalance: balance,
    totalContributed: contributed,
    totalGrowth: balance - contributed,
    yearByYear,
  };
}

export type ReverseInput = {
  currentAge: number;
  targetAge: number;
  currentSavings: number;
  targetAmount: number;
  annualReturn: number;
};

/**
 * Solve for monthly contribution that produces `targetAmount` at `targetAge`.
 * Uses the closed-form FV formula for an ordinary annuity:
 *
 *     FV = PV × (1+r)^n + PMT × [((1+r)^n − 1) / r]
 *
 * → PMT = (FV − PV × (1+r)^n) × r / ((1+r)^n − 1)
 */
export function solveRequiredContribution(input: ReverseInput): number | null {
  if (input.targetAge <= input.currentAge) return null;
  const n = (input.targetAge - input.currentAge) * 12;
  const r = input.annualReturn / 12;

  if (r === 0) {
    return Math.max(0, (input.targetAmount - input.currentSavings) / n);
  }

  const factor = Math.pow(1 + r, n);
  const numerator = (input.targetAmount - input.currentSavings * factor) * r;
  const denominator = factor - 1;
  const pmt = numerator / denominator;
  return pmt;
}

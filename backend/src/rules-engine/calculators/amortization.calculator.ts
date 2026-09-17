export interface AmortizationInput {
  loanAmount: number;
  annualInterestRate: number;
  termYears: number;
}

export function calculateMonthlyPayment(input: AmortizationInput): number {
  const totalPayments = input.termYears * 12;

  if (input.annualInterestRate === 0) {
    return input.loanAmount / totalPayments;
  }

  const monthlyRate = input.annualInterestRate / 12;
  const growthFactor = Math.pow(1 + monthlyRate, totalPayments);
  const numerator = input.loanAmount * monthlyRate * growthFactor;
  const denominator = growthFactor - 1;

  return numerator / denominator;
}

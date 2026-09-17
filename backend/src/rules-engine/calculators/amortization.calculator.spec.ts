import { calculateMonthlyPayment } from './amortization.calculator';

describe('calculateMonthlyPayment', () => {
  it('matches the known French amortization result for a standard loan', () => {
    const payment = calculateMonthlyPayment({
      loanAmount: 76500,
      annualInterestRate: 0.0499,
      termYears: 20,
    });

    expect(payment).toBeCloseTo(504.6, 0);
  });

  it('returns exactly the principal divided by term when rate is zero', () => {
    const payment = calculateMonthlyPayment({
      loanAmount: 12000,
      annualInterestRate: 0,
      termYears: 1,
    });

    expect(payment).toBeCloseTo(1000, 2);
  });
});

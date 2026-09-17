import { formatPercent, formatCurrency } from './format';

describe('formatPercent', () => {
  it('rounds a ratio to a whole-number percentage', () => {
    expect(formatPercent(0.4583)).toBe('46%');
  });
});

describe('formatCurrency', () => {
  it('formats a number as USD with no decimals for whole amounts', () => {
    expect(formatCurrency(76500)).toBe('$76,500');
  });
});

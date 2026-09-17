import { calculateDti } from './dti.calculator';
import { RuleParameters } from '../interfaces/rule-parameters.interface';

const params: RuleParameters = {
  baseAnnualInterestRate: 0.0735,
  visAnnualInterestRate: 0.0499,
  visPropertyValueThreshold: 90000,
  maxHousingDtiRatio: 0.4,
  maxTotalDtiRatio: 0.5,
  maxLtvBase: 0.8,
  maxLtvExcellentScore: 0.85,
  defaultTermYears: 20,
  scoreBandVeryHighRiskMax: 549,
  scoreBandHighRiskMax: 699,
  scoreBandModerateMax: 799,
  scoreBandGoodMax: 899,
};

describe('calculateDti', () => {
  it('flags a housing ratio above the limit as failing', () => {
    const result = calculateDti(
      { existingMonthlyDebt: 310, newMonthlyPayment: 550, monthlyIncome: 1200 },
      params,
    );

    expect(result.housingRatio).toBeCloseTo(0.4583, 3);
    expect(result.passesHousingLimit).toBe(false);
  });

  it('passes both ratios when comfortably under the limits', () => {
    const result = calculateDti(
      { existingMonthlyDebt: 100, newMonthlyPayment: 300, monthlyIncome: 1500 },
      params,
    );

    expect(result.housingRatio).toBeCloseTo(0.2, 3);
    expect(result.totalRatio).toBeCloseTo(0.2667, 3);
    expect(result.passesHousingLimit).toBe(true);
    expect(result.passesTotalLimit).toBe(true);
  });
});

import { calculateLtv } from './ltv.calculator';
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

describe('calculateLtv', () => {
  it('uses the base LTV limit for a non-excellent score', () => {
    const result = calculateLtv(
      { loanAmount: 76500, propertyValue: 85000, isExcellentScoreBand: false },
      params,
    );

    expect(result.ltv).toBeCloseTo(0.9, 3);
    expect(result.appliedMaxLtv).toBe(0.8);
    expect(result.passesLimit).toBe(false);
  });

  it('uses the higher LTV limit for an excellent score', () => {
    const result = calculateLtv(
      { loanAmount: 72250, propertyValue: 85000, isExcellentScoreBand: true },
      params,
    );

    expect(result.ltv).toBeCloseTo(0.85, 3);
    expect(result.appliedMaxLtv).toBe(0.85);
    expect(result.passesLimit).toBe(true);
  });
});

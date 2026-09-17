import { classifyScoreBand, ScoreBand } from './score-band.classifier';
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

describe('classifyScoreBand', () => {
  it('classifies 640 as high risk', () => {
    expect(classifyScoreBand(640, params)).toBe(ScoreBand.HIGH_RISK);
  });

  it('classifies 950 as excellent', () => {
    expect(classifyScoreBand(950, params)).toBe(ScoreBand.EXCELLENT);
  });

  it('classifies 500 as very high risk', () => {
    expect(classifyScoreBand(500, params)).toBe(ScoreBand.VERY_HIGH_RISK);
  });
});

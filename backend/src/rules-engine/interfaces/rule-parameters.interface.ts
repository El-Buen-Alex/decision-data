export interface RuleParameters {
  baseAnnualInterestRate: number;
  visAnnualInterestRate: number;
  visPropertyValueThreshold: number;
  maxHousingDtiRatio: number;
  maxTotalDtiRatio: number;
  maxLtvBase: number;
  maxLtvExcellentScore: number;
  defaultTermYears: number;
  scoreBandVeryHighRiskMax: number;
  scoreBandHighRiskMax: number;
  scoreBandModerateMax: number;
  scoreBandGoodMax: number;
}

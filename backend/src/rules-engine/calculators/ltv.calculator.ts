import { RuleParameters } from '../interfaces/rule-parameters.interface';

export interface LtvInput {
  loanAmount: number;
  propertyValue: number;
  isExcellentScoreBand: boolean;
}

export interface LtvResult {
  ltv: number;
  appliedMaxLtv: number;
  passesLimit: boolean;
}

export function calculateLtv(input: LtvInput, params: RuleParameters): LtvResult {
  const ltv = input.loanAmount / input.propertyValue;
  const appliedMaxLtv = input.isExcellentScoreBand ? params.maxLtvExcellentScore : params.maxLtvBase;
  const passesLimit = ltv <= appliedMaxLtv;

  return { ltv, appliedMaxLtv, passesLimit };
}

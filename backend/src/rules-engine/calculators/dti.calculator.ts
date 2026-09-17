import { RuleParameters } from '../interfaces/rule-parameters.interface';

export interface DtiInput {
  existingMonthlyDebt: number;
  newMonthlyPayment: number;
  monthlyIncome: number;
}

export interface DtiResult {
  housingRatio: number;
  totalRatio: number;
  passesHousingLimit: boolean;
  passesTotalLimit: boolean;
}

export function calculateDti(input: DtiInput, params: RuleParameters): DtiResult {
  const housingRatio = input.newMonthlyPayment / input.monthlyIncome;
  const totalDebt = input.existingMonthlyDebt + input.newMonthlyPayment;
  const totalRatio = totalDebt / input.monthlyIncome;

  const passesHousingLimit = housingRatio <= params.maxHousingDtiRatio;
  const passesTotalLimit = totalRatio <= params.maxTotalDtiRatio;

  return {
    housingRatio,
    totalRatio,
    passesHousingLimit,
    passesTotalLimit,
  };
}

import { ScoreBand } from '../calculators/score-band.classifier';
import { ApprovalCategory } from '../calculators/approval-probability.scorer';
import { IncomeType } from '../../underwriting/entities/credit-profile.entity';

export interface SimulationInput {
  score: number;
  existingMonthlyDebt: number;
  monthlyIncome: number;
  incomeType: IncomeType;
  monthsEmployed: number;
  recentDelinquency: boolean;
  propertyValue: number;
  loanAmount: number;
  isVisEligible: boolean;
  termYears?: number;
}

export interface SimulationOutput {
  scoreBand: ScoreBand;
  housingDtiRatio: number;
  totalDtiRatio: number;
  passesHousingDti: boolean;
  passesTotalDti: boolean;
  ltv: number;
  passesLtv: boolean;
  monthlyPayment: number;
  approvalPercentage: number;
  approvalCategory: ApprovalCategory;
  qualifiesToday: boolean;
  ruleSnapshot: Record<string, number>;
}

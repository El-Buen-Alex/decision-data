import { ScoreBand } from './score-band.classifier';
import { IncomeType } from '../../underwriting/entities/credit-profile.entity';

export enum ApprovalCategory {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export interface ApprovalProbabilityInput {
  scoreBand: ScoreBand;
  passesHousingDti: boolean;
  passesTotalDti: boolean;
  passesLtv: boolean;
  incomeType: IncomeType;
  monthsEmployed: number;
  recentDelinquency: boolean;
}

export interface ApprovalResult {
  points: number;
  percentage: number;
  category: ApprovalCategory;
}

const SCORE_BAND_POINTS: Record<ScoreBand, number> = {
  [ScoreBand.VERY_HIGH_RISK]: 0,
  [ScoreBand.HIGH_RISK]: 10,
  [ScoreBand.MODERATE]: 20,
  [ScoreBand.GOOD]: 30,
  [ScoreBand.EXCELLENT]: 40,
};

export function calculateApprovalProbability(input: ApprovalProbabilityInput): ApprovalResult {
  let points = SCORE_BAND_POINTS[input.scoreBand];

  points += input.passesHousingDti ? 15 : 0;
  points += input.passesTotalDti ? 15 : 0;
  points += input.passesLtv ? 15 : 0;
  points += input.incomeType === IncomeType.FORMAL ? 5 : 0;
  points += input.monthsEmployed >= 24 ? 5 : 0;
  points += input.recentDelinquency ? -20 : 0;

  const percentage = Math.max(0, Math.min(100, points));
  const category = resolveCategory(percentage);

  return { points, percentage, category };
}

function resolveCategory(percentage: number): ApprovalCategory {
  if (percentage < 35) {
    return ApprovalCategory.LOW;
  }
  if (percentage < 75) {
    return ApprovalCategory.MEDIUM;
  }
  return ApprovalCategory.HIGH;
}

import { RuleParameters } from '../interfaces/rule-parameters.interface';

export enum ScoreBand {
  VERY_HIGH_RISK = 'very_high_risk',
  HIGH_RISK = 'high_risk',
  MODERATE = 'moderate',
  GOOD = 'good',
  EXCELLENT = 'excellent',
}

export function classifyScoreBand(score: number, params: RuleParameters): ScoreBand {
  if (score <= params.scoreBandVeryHighRiskMax) {
    return ScoreBand.VERY_HIGH_RISK;
  }
  if (score <= params.scoreBandHighRiskMax) {
    return ScoreBand.HIGH_RISK;
  }
  if (score <= params.scoreBandModerateMax) {
    return ScoreBand.MODERATE;
  }
  if (score <= params.scoreBandGoodMax) {
    return ScoreBand.GOOD;
  }
  return ScoreBand.EXCELLENT;
}

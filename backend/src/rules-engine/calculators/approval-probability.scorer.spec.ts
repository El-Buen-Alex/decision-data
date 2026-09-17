import { calculateApprovalProbability, ApprovalCategory } from './approval-probability.scorer';
import { ScoreBand } from './score-band.classifier';
import { IncomeType } from '../../underwriting/entities/credit-profile.entity';

describe('calculateApprovalProbability', () => {
  it('returns LOW when DTI and LTV both fail with a high-risk score', () => {
    const result = calculateApprovalProbability({
      scoreBand: ScoreBand.HIGH_RISK,
      passesHousingDti: false,
      passesTotalDti: false,
      passesLtv: false,
      incomeType: IncomeType.INFORMAL,
      monthsEmployed: 6,
      recentDelinquency: true,
    });

    expect(result.category).toBe(ApprovalCategory.LOW);
    expect(result.percentage).toBeLessThan(35);
  });

  it('returns HIGH when everything passes with a good score and stable job', () => {
    const result = calculateApprovalProbability({
      scoreBand: ScoreBand.EXCELLENT,
      passesHousingDti: true,
      passesTotalDti: true,
      passesLtv: true,
      incomeType: IncomeType.FORMAL,
      monthsEmployed: 36,
      recentDelinquency: false,
    });

    expect(result.category).toBe(ApprovalCategory.HIGH);
    expect(result.percentage).toBeGreaterThanOrEqual(75);
  });
});

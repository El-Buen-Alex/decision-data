import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RulesEngineService } from './rules-engine.service';
import { UnderwritingRuleParameter } from '../underwriting/entities/underwriting-rule-parameter.entity';
import { IncomeType } from '../underwriting/entities/credit-profile.entity';
import { ApprovalCategory } from './calculators/approval-probability.scorer';

const MOCK_PARAMETERS = [
  { key: 'BASE_ANNUAL_INTEREST_RATE', value: '0.0735' },
  { key: 'VIS_ANNUAL_INTEREST_RATE', value: '0.0499' },
  { key: 'VIS_PROPERTY_VALUE_THRESHOLD', value: '90000' },
  { key: 'MAX_HOUSING_DTI_RATIO', value: '0.40' },
  { key: 'MAX_TOTAL_DTI_RATIO', value: '0.50' },
  { key: 'MAX_LTV_BASE', value: '0.80' },
  { key: 'MAX_LTV_EXCELLENT_SCORE', value: '0.85' },
  { key: 'DEFAULT_TERM_YEARS', value: '20' },
  { key: 'SCORE_BAND_VERY_HIGH_RISK_MAX', value: '549' },
  { key: 'SCORE_BAND_HIGH_RISK_MAX', value: '699' },
  { key: 'SCORE_BAND_MODERATE_MAX', value: '799' },
  { key: 'SCORE_BAND_GOOD_MAX', value: '899' },
];

describe('RulesEngineService', () => {
  let service: RulesEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RulesEngineService,
        {
          provide: getRepositoryToken(UnderwritingRuleParameter),
          useValue: { find: jest.fn().mockResolvedValue(MOCK_PARAMETERS) },
        },
      ],
    }).compile();

    service = module.get(RulesEngineService);
  });

  it('marks Ana-like profile as not qualifying today, with a LOW/MEDIUM approval category', async () => {
    const result = await service.runSimulation({
      score: 640,
      existingMonthlyDebt: 310,
      monthlyIncome: 1200,
      incomeType: IncomeType.FORMAL,
      monthsEmployed: 18,
      recentDelinquency: false,
      propertyValue: 85000,
      loanAmount: 76500,
      isVisEligible: true,
    });

    expect(result.qualifiesToday).toBe(false);
    expect([ApprovalCategory.LOW, ApprovalCategory.MEDIUM]).toContain(
      result.approvalCategory,
    );
  });
});

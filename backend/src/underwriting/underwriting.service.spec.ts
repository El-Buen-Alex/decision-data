import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { UnderwritingService } from './underwriting.service';
import { RulesEngineService } from '../rules-engine/rules-engine.service';
import { CreditProfile, IncomeType } from './entities/credit-profile.entity';
import { MortgageGoal, PropertyType } from './entities/mortgage-goal.entity';
import { Simulation } from './entities/simulation.entity';
import { ApprovalCategory } from '../rules-engine/calculators/approval-probability.scorer';
import { ScoreBand } from '../rules-engine/calculators/score-band.classifier';

describe('UnderwritingService', () => {
  let service: UnderwritingService;
  const findOneProfileMock = jest.fn();
  const findOneGoalMock = jest.fn();
  const saveSimulationMock = jest.fn();
  const runSimulationMock = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnderwritingService,
        {
          provide: getRepositoryToken(CreditProfile),
          useValue: { findOne: findOneProfileMock },
        },
        {
          provide: getRepositoryToken(MortgageGoal),
          useValue: { findOne: findOneGoalMock },
        },
        {
          provide: getRepositoryToken(Simulation),
          useValue: {
            save: saveSimulationMock,
            create: (v: unknown) => v,
            find: jest.fn(),
          },
        },
        {
          provide: RulesEngineService,
          useValue: { runSimulation: runSimulationMock },
        },
      ],
    }).compile();

    service = module.get(UnderwritingService);
    findOneProfileMock.mockReset();
    findOneGoalMock.mockReset();
    saveSimulationMock.mockReset();
    runSimulationMock.mockReset();
  });

  it('throws NotFoundException when the user has no credit profile', async () => {
    findOneProfileMock.mockResolvedValue(null);
    await expect(service.getProfile('user-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('persists a simulation using the rules engine output', async () => {
    findOneGoalMock.mockResolvedValue({
      id: 'goal-1',
      userId: 'user-1',
      propertyValue: '85000.00',
      propertyType: PropertyType.VIS,
      desiredLoanAmount: '76500.00',
    });
    findOneProfileMock.mockResolvedValue({
      id: 'profile-1',
      userId: 'user-1',
      score: 640,
      incomeType: IncomeType.FORMAL,
      monthsEmployed: 18,
      recentDelinquency: false,
    });
    runSimulationMock.mockResolvedValue({
      scoreBand: ScoreBand.HIGH_RISK,
      housingDtiRatio: 0.46,
      totalDtiRatio: 0.5,
      passesHousingDti: false,
      passesTotalDti: false,
      ltv: 0.9,
      passesLtv: false,
      monthlyPayment: 550,
      approvalPercentage: 30,
      approvalCategory: ApprovalCategory.LOW,
      qualifiesToday: false,
      ruleSnapshot: {},
    });
    saveSimulationMock.mockImplementation(async (entity) => ({
      id: 'sim-1',
      ...entity,
    }));

    const result = await service.createSimulation('user-1', {
      adjustedExistingMonthlyDebt: 310,
      adjustedMonthlyIncome: 1200,
      adjustedPropertyValue: 85000,
      adjustedLoanAmount: 76500,
      projectedScore: 640,
    });

    expect(result.qualifiesToday).toBe(false);
    expect(saveSimulationMock).toHaveBeenCalled();
  });
});

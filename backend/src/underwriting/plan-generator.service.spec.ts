import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { PlanGeneratorService } from './plan-generator.service';
import { Simulation } from './entities/simulation.entity';
import { Plan, PlanStatus } from './entities/plan.entity';
import { Milestone, MilestoneStatus } from './entities/milestone.entity';
import { UnderwritingService } from './underwriting.service';

describe('PlanGeneratorService', () => {
  let service: PlanGeneratorService;
  const findOneSimulationMock = jest.fn();
  const savePlanMock = jest.fn();
  const saveMilestonesMock = jest.fn();
  const findOnePlanMock = jest.fn();
  const findMilestonesMock = jest.fn();
  const createSimulationMock = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanGeneratorService,
        { provide: getRepositoryToken(Simulation), useValue: { findOne: findOneSimulationMock } },
        {
          provide: getRepositoryToken(Plan),
          useValue: { save: savePlanMock, create: (v: unknown) => v, findOne: findOnePlanMock },
        },
        {
          provide: getRepositoryToken(Milestone),
          useValue: {
            save: saveMilestonesMock,
            create: (v: unknown) => v,
            find: findMilestonesMock,
          },
        },
        { provide: UnderwritingService, useValue: { createSimulation: createSimulationMock } },
      ],
    }).compile();

    service = module.get(PlanGeneratorService);
    findOneSimulationMock.mockReset();
    savePlanMock.mockReset();
    saveMilestonesMock.mockReset();
    findOnePlanMock.mockReset();
    findMilestonesMock.mockReset();
    createSimulationMock.mockReset();
  });

  it('throws NotFoundException for a simulation that does not belong to the user', async () => {
    findOneSimulationMock.mockResolvedValue(null);
    await expect(service.generateFromSimulation('user-1', 'sim-x')).rejects.toThrow(NotFoundException);
  });

  it('creates three milestones with increasing target dates', async () => {
    findOneSimulationMock.mockResolvedValue({
      id: 'sim-1',
      userId: 'user-1',
      outputs: { housingDtiRatio: 0.46, ltv: 0.9, approvalPercentage: 40 },
    });
    savePlanMock.mockImplementation(async (entity) => ({ id: 'plan-1', ...entity }));
    saveMilestonesMock.mockImplementation(async (entities) => entities);

    const result = await service.generateFromSimulation('user-1', 'sim-1');

    expect(result.plan.id).toBe('plan-1');
    expect(result.milestones).toHaveLength(3);
    expect(result.milestones[0].sequenceNumber).toBe(1);
    expect(saveMilestonesMock).toHaveBeenCalledTimes(1);
  });

  describe('checkIn', () => {
    const dto = {
      adjustedExistingMonthlyDebt: 100,
      adjustedMonthlyIncome: 1000,
      adjustedPropertyValue: 50000,
      adjustedLoanAmount: 40000,
      projectedScore: 700,
    };

    it('throws NotFoundException for a plan that does not belong to the user', async () => {
      findOnePlanMock.mockResolvedValue(null);
      await expect(service.checkIn('user-1', 'plan-x', dto)).rejects.toThrow(NotFoundException);
    });

    it('marks a pending milestone as done when the new simulation passes its target', async () => {
      findOnePlanMock.mockResolvedValue({ id: 'plan-1', userId: 'user-1', status: PlanStatus.ACTIVE });
      createSimulationMock.mockResolvedValue({ housingDtiRatio: 0.35, ltv: 0.9, qualifiesToday: false });
      findMilestonesMock.mockResolvedValue([
        {
          id: 'm1',
          planId: 'plan-1',
          targetMetric: 'housing_dti_ratio',
          targetValue: '0.40',
          status: MilestoneStatus.PENDING,
        },
      ]);
      saveMilestonesMock.mockImplementation(async (entity) => entity);

      const result = await service.checkIn('user-1', 'plan-1', dto);

      expect(result.milestones[0].status).toBe(MilestoneStatus.DONE);
      expect(result.milestones[0].completedAt).toBeInstanceOf(Date);
    });

    it('leaves a pending milestone pending when the new simulation still misses its target', async () => {
      findOnePlanMock.mockResolvedValue({ id: 'plan-1', userId: 'user-1', status: PlanStatus.ACTIVE });
      createSimulationMock.mockResolvedValue({ housingDtiRatio: 0.55, ltv: 0.9, qualifiesToday: false });
      findMilestonesMock.mockResolvedValue([
        {
          id: 'm1',
          planId: 'plan-1',
          targetMetric: 'housing_dti_ratio',
          targetValue: '0.40',
          status: MilestoneStatus.PENDING,
        },
      ]);

      const result = await service.checkIn('user-1', 'plan-1', dto);

      expect(result.milestones[0].status).toBe(MilestoneStatus.PENDING);
      expect(saveMilestonesMock).not.toHaveBeenCalled();
    });

    it('does not re-evaluate a milestone that is already done', async () => {
      findOnePlanMock.mockResolvedValue({ id: 'plan-1', userId: 'user-1', status: PlanStatus.ACTIVE });
      createSimulationMock.mockResolvedValue({ housingDtiRatio: 0.9, ltv: 0.9, qualifiesToday: false });
      const completedAt = new Date('2026-01-01');
      findMilestonesMock.mockResolvedValue([
        {
          id: 'm1',
          planId: 'plan-1',
          targetMetric: 'housing_dti_ratio',
          targetValue: '0.40',
          status: MilestoneStatus.DONE,
          completedAt,
        },
      ]);

      const result = await service.checkIn('user-1', 'plan-1', dto);

      expect(result.milestones[0].completedAt).toBe(completedAt);
      expect(saveMilestonesMock).not.toHaveBeenCalled();
    });

    it('marks the plan completed once every milestone is done', async () => {
      const plan = { id: 'plan-1', userId: 'user-1', status: PlanStatus.ACTIVE };
      findOnePlanMock.mockResolvedValue(plan);
      createSimulationMock.mockResolvedValue({ housingDtiRatio: 0.1, ltv: 0.5, qualifiesToday: true });
      findMilestonesMock.mockResolvedValue([
        {
          id: 'm1',
          planId: 'plan-1',
          targetMetric: 'qualifies_today',
          targetValue: '1',
          status: MilestoneStatus.PENDING,
        },
      ]);
      saveMilestonesMock.mockImplementation(async (entity) => entity);
      savePlanMock.mockImplementation(async (entity) => entity);

      const result = await service.checkIn('user-1', 'plan-1', dto);

      expect(result.plan.status).toBe(PlanStatus.COMPLETED);
      expect(savePlanMock).toHaveBeenCalledWith(expect.objectContaining({ status: PlanStatus.COMPLETED }));
    });
  });
});

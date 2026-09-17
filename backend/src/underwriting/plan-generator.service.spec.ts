import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { PlanGeneratorService } from './plan-generator.service';
import { Simulation } from './entities/simulation.entity';
import { Plan } from './entities/plan.entity';
import { Milestone } from './entities/milestone.entity';

describe('PlanGeneratorService', () => {
  let service: PlanGeneratorService;
  const findOneSimulationMock = jest.fn();
  const savePlanMock = jest.fn();
  const saveMilestonesMock = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanGeneratorService,
        { provide: getRepositoryToken(Simulation), useValue: { findOne: findOneSimulationMock } },
        {
          provide: getRepositoryToken(Plan),
          useValue: { save: savePlanMock, create: (v: unknown) => v },
        },
        {
          provide: getRepositoryToken(Milestone),
          useValue: { save: saveMilestonesMock, create: (v: unknown) => v, find: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(PlanGeneratorService);
    findOneSimulationMock.mockReset();
    savePlanMock.mockReset();
    saveMilestonesMock.mockReset();
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
});

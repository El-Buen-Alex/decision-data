import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AgentService } from './agent.service';
import { LlmClientService } from './llm-client.service';
import { TemplateResolverService } from './template-resolver.service';
import { AgentContextBuilderService } from './agent-context-builder.service';
import { UnderwritingService } from '../underwriting/underwriting.service';
import { AgentLog } from './entities/agent-log.entity';
import { ApprovalCategory } from '../rules-engine/calculators/approval-probability.scorer';
import { ScoreBand } from '../rules-engine/calculators/score-band.classifier';

describe('AgentService', () => {
  let service: AgentService;
  const saveLogMock = jest.fn().mockImplementation(async (entity) => entity);
  const generateTemplateMock = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentService,
        TemplateResolverService,
        AgentContextBuilderService,
        { provide: LlmClientService, useValue: { generateTemplate: generateTemplateMock } },
        {
          provide: UnderwritingService,
          useValue: {
            getSimulationById: jest.fn().mockResolvedValue({
              id: 'sim-1',
              scoreBand: ScoreBand.HIGH_RISK,
              housingDtiRatio: 0.46,
              totalDtiRatio: 0.5,
              ltv: 0.9,
              monthlyPayment: 550,
              approvalPercentage: 30,
              approvalCategory: ApprovalCategory.LOW,
              qualifiesToday: false,
              createdAt: new Date(),
            }),
            getProfile: jest.fn().mockResolvedValue({ score: 640 }),
          },
        },
        { provide: getRepositoryToken(AgentLog), useValue: { save: saveLogMock, create: (v: unknown) => v } },
      ],
    }).compile();

    service = module.get(AgentService);
    generateTemplateMock.mockReset();
    saveLogMock.mockClear();
  });

  it('resolves the LLM template against real simulation numbers and logs the interaction', async () => {
    generateTemplateMock.mockResolvedValue(
      'Hoy tu score es {{score}} y tu probabilidad de aprobación es {{approvalPercentage}}.',
    );

    const result = await service.explainSimulation('user-1', 'sim-1');

    expect(result.text).toContain('640');
    expect(result.text).toContain('30%');
    expect(saveLogMock).toHaveBeenCalled();
  });
});

import { AgentContextBuilderService } from './agent-context-builder.service';
import { ApprovalCategory } from '../rules-engine/calculators/approval-probability.scorer';
import { ScoreBand } from '../rules-engine/calculators/score-band.classifier';

describe('AgentContextBuilderService', () => {
  const service = new AgentContextBuilderService();

  it('formats ratios as whole-number percentages and booleans as spanish words', () => {
    const context = service.buildFromSimulation(
      {
        id: 'sim-1',
        scoreBand: ScoreBand.HIGH_RISK,
        housingDtiRatio: 0.4583,
        totalDtiRatio: 0.5,
        ltv: 0.9,
        monthlyPayment: 550.4,
        approvalPercentage: 30,
        approvalCategory: ApprovalCategory.LOW,
        qualifiesToday: false,
        createdAt: new Date(),
      },
      640,
    );

    expect(context.housingDtiRatioPercent).toBe('46%');
    expect(context.qualifiesToday).toBe('no');
    expect(context.score).toBe(640);
  });
});

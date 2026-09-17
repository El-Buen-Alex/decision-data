import { Injectable } from '@nestjs/common';
import { SimulationResponse } from '../underwriting/interfaces/simulation-response.interface';
import { AgentContext } from './interfaces/agent-context.interface';

@Injectable()
export class AgentContextBuilderService {
  buildFromSimulation(
    simulation: SimulationResponse,
    score: number,
  ): AgentContext {
    return {
      score,
      housingDtiRatioPercent: this.toPercent(simulation.housingDtiRatio),
      ltvPercent: this.toPercent(simulation.ltv),
      monthlyPayment: simulation.monthlyPayment.toFixed(2),
      approvalPercentage: `${simulation.approvalPercentage}%`,
      approvalCategory: simulation.approvalCategory,
      qualifiesToday: simulation.qualifiesToday ? 'sí' : 'no',
    };
  }

  private toPercent(ratio: number): string {
    return `${Math.round(ratio * 100)}%`;
  }
}

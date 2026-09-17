import { ScoreBand } from '../../rules-engine/calculators/score-band.classifier';
import { ApprovalCategory } from '../../rules-engine/calculators/approval-probability.scorer';

export interface SimulationResponse {
  id: string;
  // Score proyectado con el que se calculó esta simulación (dto.projectedScore),
  // no el score almacenado en el perfil: la simulación es un escenario "qué pasaría si".
  score: number;
  scoreBand: ScoreBand;
  housingDtiRatio: number;
  totalDtiRatio: number;
  ltv: number;
  monthlyPayment: number;
  approvalPercentage: number;
  approvalCategory: ApprovalCategory;
  qualifiesToday: boolean;
  createdAt: Date;
}

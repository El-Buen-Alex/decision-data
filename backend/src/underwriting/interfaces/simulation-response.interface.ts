import { ScoreBand } from '../../rules-engine/calculators/score-band.classifier';
import { ApprovalCategory } from '../../rules-engine/calculators/approval-probability.scorer';

export interface SimulationResponse {
  id: string;
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

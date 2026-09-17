export interface ApiResponse<T> {
  status: 'success' | 'error';
  message: string;
  data: T | null;
}

export type IncomeType = 'formal' | 'informal';
export type PropertyType = 'private' | 'vis';
export type ScoreBand = 'very_high_risk' | 'high_risk' | 'moderate' | 'good' | 'excellent';
export type ApprovalCategory = 'low' | 'medium' | 'high';

export interface CreditProfile {
  id: string;
  score: number;
  cardUtilizationPercent: string;
  monthlyIncome: string;
  incomeType: IncomeType;
  monthsEmployed: number;
  recentDelinquency: boolean;
  existingMonthlyDebt: string;
}

export interface MortgageGoal {
  id: string;
  propertyValue: string;
  propertyType: PropertyType;
  desiredLoanAmount: string;
}

export interface SimulationResponse {
  id: string;
  // Score proyectado con el que se calculó esta simulación, distinto del score
  // almacenado en el perfil: la simulación es un escenario "qué pasaría si".
  score: number;
  scoreBand: ScoreBand;
  housingDtiRatio: number;
  totalDtiRatio: number;
  ltv: number;
  monthlyPayment: number;
  approvalPercentage: number;
  approvalCategory: ApprovalCategory;
  qualifiesToday: boolean;
  createdAt: string;
}

export interface RuleParameter {
  id: string;
  key: string;
  value: string;
  description: string;
  source: string;
}

export interface Milestone {
  id: string;
  sequenceNumber: number;
  description: string | null;
  targetMetric: string;
  targetValue: string;
  targetDate: string;
  status: 'pending' | 'done';
}

export interface PlanWithMilestones {
  plan: { id: string; status: 'active' | 'completed'; createdAt: string };
  milestones: Milestone[];
}

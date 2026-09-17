import { apiRequest } from './api-client';
import { CreditProfile, MortgageGoal, PlanWithMilestones, RuleParameter, SimulationResponse } from './types';

export function fetchProfile(token: string): Promise<CreditProfile> {
  return apiRequest<CreditProfile>('/underwriting/profile', { token });
}

export function fetchGoal(token: string): Promise<MortgageGoal> {
  return apiRequest<MortgageGoal>('/underwriting/goal', { token });
}

export interface CreateSimulationInput {
  adjustedExistingMonthlyDebt: number;
  adjustedMonthlyIncome: number;
  adjustedPropertyValue: number;
  adjustedLoanAmount: number;
  projectedScore: number;
  isVisEligible?: boolean;
}

export function createSimulation(token: string, input: CreateSimulationInput): Promise<SimulationResponse> {
  return apiRequest<SimulationResponse>('/underwriting/simulations', {
    method: 'POST',
    token,
    body: input,
  });
}

export function createPlan(token: string, simulationId: string): Promise<PlanWithMilestones> {
  return apiRequest<PlanWithMilestones>('/underwriting/plans', {
    method: 'POST',
    token,
    body: { simulationId },
  });
}

export function fetchPlan(token: string, planId: string): Promise<PlanWithMilestones> {
  return apiRequest<PlanWithMilestones>(`/underwriting/plans/${planId}`, { token });
}

export function fetchRuleParameters(token: string): Promise<RuleParameter[]> {
  return apiRequest<RuleParameter[]>('/underwriting/rule-parameters', { token });
}

export function updateRuleParameter(token: string, key: string, value: number): Promise<RuleParameter> {
  return apiRequest<RuleParameter>(`/underwriting/rule-parameters/${key}`, {
    method: 'PATCH',
    token,
    body: { value },
  });
}

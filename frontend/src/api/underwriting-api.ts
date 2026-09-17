import { apiRequest } from './api-client';
import { CreditProfile, MortgageGoal, SimulationResponse } from './types';

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

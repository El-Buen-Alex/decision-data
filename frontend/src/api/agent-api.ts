import { apiRequest } from './api-client';

interface AgentReply {
  text: string;
}

export function explainSimulation(token: string, simulationId: string): Promise<AgentReply> {
  return apiRequest<AgentReply>('/agent/explain', {
    method: 'POST',
    token,
    body: { simulationId },
  });
}

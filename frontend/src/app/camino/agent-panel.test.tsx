import { render, screen } from '@testing-library/react';
import { AgentPanel } from './agent-panel';

jest.mock('@/auth/use-auth', () => ({ useAuth: () => ({ token: 'fake-token' }) }));
jest.mock('@/api/agent-api', () => ({
  explainSimulation: jest.fn().mockResolvedValue({ text: 'Hoy tu score es 640.' }),
}));

describe('AgentPanel', () => {
  it('shows the agent explanation once loaded', async () => {
    render(<AgentPanel simulationId="sim-1" />);

    expect(await screen.findByText('Hoy tu score es 640.')).toBeInTheDocument();
  });
});

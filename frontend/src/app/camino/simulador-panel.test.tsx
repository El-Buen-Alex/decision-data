import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SimuladorPanel } from './simulador-panel';
import { createSimulation } from '@/api/underwriting-api';

jest.mock('@/auth/use-auth', () => ({ useAuth: () => ({ token: 'fake-token' }) }));
jest.mock('@/api/underwriting-api', () => ({
  createSimulation: jest.fn().mockResolvedValue({
    id: 'sim-2',
    housingDtiRatio: 0.3,
    ltv: 0.75,
    approvalPercentage: 70,
    approvalCategory: 'medium',
    qualifiesToday: true,
    monthlyPayment: 400,
    scoreBand: 'good',
    createdAt: new Date().toISOString(),
  }),
}));

const baseline = {
  profile: {
    id: 'p1',
    score: 640,
    cardUtilizationPercent: '78',
    monthlyIncome: '1200',
    incomeType: 'formal' as const,
    monthsEmployed: 18,
    recentDelinquency: false,
    existingMonthlyDebt: '310',
  },
  goal: { id: 'g1', propertyValue: '85000', propertyType: 'vis' as const, desiredLoanAmount: '76500' },
};

describe('SimuladorPanel', () => {
  it('shows the recalculated qualification after adjusting existing debt', async () => {
    const onSimulated = jest.fn();
    render(<SimuladorPanel baseline={baseline} onSimulated={onSimulated} />);

    const debtInput = screen.getByLabelText('Deuda mensual existente');
    await userEvent.clear(debtInput);
    await userEvent.type(debtInput, '100');
    await userEvent.click(screen.getByText('Recalcular'));

    expect(await screen.findByText(/Con este escenario, sí calificarías/)).toBeInTheDocument();
    expect(onSimulated).toHaveBeenCalledWith('sim-2');
  });

  it('shows the recalculated ratios and monthly payment behind the verdict', async () => {
    render(<SimuladorPanel baseline={baseline} onSimulated={jest.fn()} />);

    await userEvent.click(screen.getByText('Recalcular'));

    expect(await screen.findByText('30%')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('$400')).toBeInTheDocument();
  });

  it('lets the user adjust the loan amount, so LTV (not just DTI) can be recalculated', async () => {
    render(<SimuladorPanel baseline={baseline} onSimulated={jest.fn()} />);

    const loanInput = screen.getByLabelText(/monto del préstamo/i);
    expect(loanInput).toHaveValue('76500');

    await userEvent.clear(loanInput);
    await userEvent.type(loanInput, '60000');
    await userEvent.click(screen.getByText('Recalcular'));

    await screen.findByText(/Con este escenario/);
    expect(createSimulation).toHaveBeenCalledWith(
      'fake-token',
      expect.objectContaining({ adjustedLoanAmount: 60000 }),
    );
  });
});

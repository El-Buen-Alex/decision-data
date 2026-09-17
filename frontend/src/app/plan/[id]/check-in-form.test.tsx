import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckInForm } from './check-in-form';
import { checkInPlan } from '@/api/underwriting-api';

jest.mock('@/auth/use-auth', () => ({ useAuth: () => ({ token: 'fake-token' }) }));
jest.mock('@/api/underwriting-api', () => ({
  checkInPlan: jest.fn().mockResolvedValue({
    plan: { id: 'plan-1', status: 'active', createdAt: new Date().toISOString() },
    milestones: [],
    simulation: {
      id: 'sim-2',
      housingDtiRatio: 0.3,
      ltv: 0.75,
      approvalPercentage: 70,
      approvalCategory: 'medium',
      qualifiesToday: true,
      monthlyPayment: 400,
      scoreBand: 'good',
      createdAt: new Date().toISOString(),
    },
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

describe('CheckInForm', () => {
  it('sends the updated numbers to the check-in endpoint and reports the result upward', async () => {
    const onCheckedIn = jest.fn();
    render(<CheckInForm planId="plan-1" baseline={baseline} onCheckedIn={onCheckedIn} />);

    const debtInput = screen.getByLabelText('Deuda mensual existente');
    await userEvent.clear(debtInput);
    await userEvent.type(debtInput, '100');
    await userEvent.click(screen.getByText('Actualizar mis números'));

    expect(await screen.findByText(/Con estos números, sí calificarías/)).toBeInTheDocument();
    expect(checkInPlan).toHaveBeenCalledWith(
      'fake-token',
      'plan-1',
      expect.objectContaining({ adjustedExistingMonthlyDebt: 100 }),
    );
    expect(onCheckedIn).toHaveBeenCalled();
  });
});

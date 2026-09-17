'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/auth/use-auth';
import { checkInPlan } from '@/api/underwriting-api';
import { CreditProfile, MortgageGoal, PlanCheckInResponse } from '@/api/types';
import { ApiError } from '@/api/api-error';
import { ErrorState } from '@/components/state/error-state';
import { LoadingState } from '@/components/state/loading-state';
import { formatCurrency, formatPercent } from '@/lib/format';

interface CheckInFormProps {
  planId: string;
  baseline: { profile: CreditProfile; goal: MortgageGoal };
  onCheckedIn: (result: PlanCheckInResponse) => void;
}

export function CheckInForm({ planId, baseline, onCheckedIn }: CheckInFormProps): JSX.Element {
  const { token } = useAuth();
  const [existingDebt, setExistingDebt] = useState(baseline.profile.existingMonthlyDebt);
  const [monthlyIncome, setMonthlyIncome] = useState(baseline.profile.monthlyIncome);
  const [loanAmount, setLoanAmount] = useState(baseline.goal.desiredLoanAmount);
  const [result, setResult] = useState<PlanCheckInResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  async function handleCheckIn(): Promise<void> {
    if (!token) {
      return;
    }
    setIsCheckingIn(true);
    setErrorMessage(null);

    try {
      const checkInResult = await checkInPlan(token, planId, {
        adjustedExistingMonthlyDebt: Number(existingDebt),
        adjustedMonthlyIncome: Number(monthlyIncome),
        adjustedPropertyValue: Number(baseline.goal.propertyValue),
        adjustedLoanAmount: Number(loanAmount),
        projectedScore: baseline.profile.score,
      });
      setResult(checkInResult);
      onCheckedIn(checkInResult);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo actualizar tu progreso.';
      setErrorMessage(message);
    } finally {
      setIsCheckingIn(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl bg-surface p-6" aria-label="Actualizar mis números">
      <h2 className="text-xl font-semibold">¿Cómo van tus números hoy?</h2>

      <div className="mt-4 flex flex-col gap-3">
        <label htmlFor="check-in-existing-debt">Deuda mensual existente</label>
        <Input
          id="check-in-existing-debt"
          value={existingDebt}
          onChange={(e) => setExistingDebt(e.target.value)}
        />

        <label htmlFor="check-in-monthly-income">Ingreso mensual</label>
        <Input
          id="check-in-monthly-income"
          value={monthlyIncome}
          onChange={(e) => setMonthlyIncome(e.target.value)}
        />

        <label htmlFor="check-in-loan-amount">Monto del préstamo</label>
        <Input
          id="check-in-loan-amount"
          value={loanAmount}
          onChange={(e) => setLoanAmount(e.target.value)}
        />

        <Button onClick={handleCheckIn} disabled={isCheckingIn}>
          {isCheckingIn ? 'Actualizando...' : 'Actualizar mis números'}
        </Button>
      </div>

      {isCheckingIn && <LoadingState label="Actualizando tu progreso..." />}
      {errorMessage && <ErrorState message={errorMessage} onRetry={handleCheckIn} />}

      {result && (
        <div className="mt-4">
          <p className="font-medium">
            {result.simulation.qualifiesToday
              ? 'Con estos números, sí calificarías.'
              : 'Con estos números, todavía no calificarías.'}{' '}
            Probabilidad de aprobación: {result.simulation.approvalPercentage}%.
          </p>
          <dl className="mt-3 flex flex-col gap-2 text-sm text-fg-2 sm:flex-row sm:gap-6">
            <div>
              <dt>Cuota sobre tu ingreso</dt>
              <dd className="font-medium text-fg">{formatPercent(result.simulation.housingDtiRatio)}</dd>
            </div>
            <div>
              <dt>Financiamiento sobre el inmueble</dt>
              <dd className="font-medium text-fg">{formatPercent(result.simulation.ltv)}</dd>
            </div>
            <div>
              <dt>Cuota mensual estimada</dt>
              <dd className="font-medium text-fg">{formatCurrency(result.simulation.monthlyPayment)}</dd>
            </div>
          </dl>
        </div>
      )}
    </section>
  );
}

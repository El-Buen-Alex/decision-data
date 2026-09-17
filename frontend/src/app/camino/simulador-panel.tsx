'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/auth/use-auth';
import { createSimulation } from '@/api/underwriting-api';
import { CreditProfile, MortgageGoal, SimulationResponse } from '@/api/types';
import { ApiError } from '@/api/api-error';
import { ErrorState } from '@/components/state/error-state';
import { LoadingState } from '@/components/state/loading-state';
import { formatCurrency, formatPercent } from '@/lib/format';

interface SimuladorPanelProps {
  baseline: { profile: CreditProfile; goal: MortgageGoal };
  onSimulated: (simulationId: string) => void;
}

export function SimuladorPanel({ baseline, onSimulated }: SimuladorPanelProps): JSX.Element {
  const { token } = useAuth();
  const [existingDebt, setExistingDebt] = useState(baseline.profile.existingMonthlyDebt);
  const [monthlyIncome, setMonthlyIncome] = useState(baseline.profile.monthlyIncome);
  const [loanAmount, setLoanAmount] = useState(baseline.goal.desiredLoanAmount);
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  async function handleRecalculate(): Promise<void> {
    if (!token) {
      return;
    }
    setIsSimulating(true);
    setErrorMessage(null);

    try {
      const simulation = await createSimulation(token, {
        adjustedExistingMonthlyDebt: Number(existingDebt),
        adjustedMonthlyIncome: Number(monthlyIncome),
        adjustedPropertyValue: Number(baseline.goal.propertyValue),
        adjustedLoanAmount: Number(loanAmount),
        projectedScore: baseline.profile.score,
      });
      setResult(simulation);
      onSimulated(simulation.id);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo recalcular el escenario.';
      setErrorMessage(message);
    } finally {
      setIsSimulating(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl bg-surface p-6" aria-label="Simulador de escenarios">
      <h2 className="text-xl font-semibold">¿Qué pasaría si...?</h2>

      <div className="mt-4 flex flex-col gap-3">
        <label htmlFor="existing-debt">Deuda mensual existente</label>
        <Input id="existing-debt" value={existingDebt} onChange={(e) => setExistingDebt(e.target.value)} />

        <label htmlFor="monthly-income">Ingreso mensual</label>
        <Input id="monthly-income" value={monthlyIncome} onChange={(e) => setMonthlyIncome(e.target.value)} />

        <label htmlFor="loan-amount">Monto del préstamo (con más ahorro para la entrada, baja este monto)</label>
        <Input id="loan-amount" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} />

        <Button onClick={handleRecalculate} disabled={isSimulating}>
          {isSimulating ? 'Recalculando...' : 'Recalcular'}
        </Button>
      </div>

      {isSimulating && <LoadingState label="Recalculando tu escenario..." />}
      {errorMessage && <ErrorState message={errorMessage} onRetry={handleRecalculate} />}

      {result && (
        <div className="mt-4">
          <p className="font-medium">
            {result.qualifiesToday
              ? 'Con este escenario, sí calificarías.'
              : 'Con este escenario, todavía no calificarías.'}{' '}
            Probabilidad de aprobación: {result.approvalPercentage}%.
          </p>
          <dl className="mt-3 flex flex-col gap-2 text-sm text-fg-2 sm:flex-row sm:gap-6">
            <div>
              <dt>Cuota sobre tu ingreso</dt>
              <dd className="font-medium text-fg">{formatPercent(result.housingDtiRatio)}</dd>
            </div>
            <div>
              <dt>Financiamiento sobre el inmueble</dt>
              <dd className="font-medium text-fg">{formatPercent(result.ltv)}</dd>
            </div>
            <div>
              <dt>Cuota mensual estimada</dt>
              <dd className="font-medium text-fg">{formatCurrency(result.monthlyPayment)}</dd>
            </div>
          </dl>
        </div>
      )}
    </section>
  );
}

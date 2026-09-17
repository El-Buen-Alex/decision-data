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

interface SimuladorPanelProps {
  baseline: { profile: CreditProfile; goal: MortgageGoal };
  onSimulated: (simulationId: string) => void;
}

export function SimuladorPanel({ baseline, onSimulated }: SimuladorPanelProps): JSX.Element {
  const { token } = useAuth();
  const [existingDebt, setExistingDebt] = useState(baseline.profile.existingMonthlyDebt);
  const [monthlyIncome, setMonthlyIncome] = useState(baseline.profile.monthlyIncome);
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
        adjustedLoanAmount: Number(baseline.goal.desiredLoanAmount),
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

        <Button onClick={handleRecalculate} disabled={isSimulating}>
          {isSimulating ? 'Recalculando...' : 'Recalcular'}
        </Button>
      </div>

      {isSimulating && <LoadingState label="Recalculando tu escenario..." />}
      {errorMessage && <ErrorState message={errorMessage} onRetry={handleRecalculate} />}

      {result && (
        <p className="mt-4 font-medium">
          {result.qualifiesToday
            ? 'Con este escenario, sí calificarías.'
            : 'Con este escenario, todavía no calificarías.'}{' '}
          Probabilidad de aprobación: {result.approvalPercentage}%.
        </p>
      )}
    </section>
  );
}

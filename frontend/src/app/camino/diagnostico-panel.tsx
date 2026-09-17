'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/use-auth';
import { fetchProfile, fetchGoal, createSimulation } from '@/api/underwriting-api';
import { CreditProfile, MortgageGoal, SimulationResponse } from '@/api/types';
import { ApiError } from '@/api/api-error';
import { LoadingState } from '@/components/state/loading-state';
import { ErrorState } from '@/components/state/error-state';
import { formatPercent } from '@/lib/format';

interface DiagnosticoData {
  profile: CreditProfile;
  goal: MortgageGoal;
  simulation: SimulationResponse;
}

export function DiagnosticoPanel({ onDiagnosed }: { onDiagnosed: (data: DiagnosticoData) => void }): JSX.Element {
  const { token } = useAuth();
  const [data, setData] = useState<DiagnosticoData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDiagnosis();
  }, [token]);

  async function loadDiagnosis(): Promise<void> {
    if (!token) {
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const profile = await fetchProfile(token);
      const goal = await fetchGoal(token);
      const simulation = await createSimulation(token, {
        adjustedExistingMonthlyDebt: Number(profile.existingMonthlyDebt),
        adjustedMonthlyIncome: Number(profile.monthlyIncome),
        adjustedPropertyValue: Number(goal.propertyValue),
        adjustedLoanAmount: Number(goal.desiredLoanAmount),
        projectedScore: profile.score,
      });

      const diagnosis = { profile, goal, simulation };
      setData(diagnosis);
      onDiagnosed(diagnosis);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo cargar tu diagnóstico.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return <LoadingState label="Calculando tu situación actual..." />;
  }

  if (errorMessage) {
    return <ErrorState message={errorMessage} onRetry={loadDiagnosis} />;
  }

  if (!data) {
    return <ErrorState message="No hay datos de diagnóstico disponibles." />;
  }

  return (
    <section className="rounded-xl bg-surface p-6" aria-label="Diagnóstico inicial">
      <h2 className="text-xl font-semibold">
        {data.simulation.qualifiesToday ? 'Hoy calificarías' : 'Hoy no calificarías'}
      </h2>
      <p className="mt-2 text-fg-2">
        Tu score es {data.profile.score}. Tu cuota representaría el {formatPercent(data.simulation.housingDtiRatio)}{' '}
        de tu ingreso (el máximo permitido es 40%), y tu financiamiento sería el{' '}
        {formatPercent(data.simulation.ltv)} del valor del inmueble.
      </p>
      <p className="mt-2 font-medium">Probabilidad de aprobación: {data.simulation.approvalPercentage}%</p>
    </section>
  );
}

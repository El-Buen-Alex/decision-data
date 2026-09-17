'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/auth/protected-route';
import { AppHeader } from '@/components/nav/app-header';
import { useAuth } from '@/auth/use-auth';
import { fetchPlan } from '@/api/underwriting-api';
import { PlanWithMilestones } from '@/api/types';
import { ApiError } from '@/api/api-error';
import { LoadingState } from '@/components/state/loading-state';
import { ErrorState } from '@/components/state/error-state';
import { MilestoneTimeline } from './milestone-timeline';
import { ChecklistFinal } from './checklist-final';

function PlanDetail({ planId }: { planId: string }): JSX.Element {
  const { token } = useAuth();
  const [data, setData] = useState<PlanWithMilestones | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPlan();
  }, [token, planId]);

  async function loadPlan(): Promise<void> {
    if (!token) {
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await fetchPlan(token, planId);
      setData(result);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo cargar el plan.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return <LoadingState label="Cargando tu plan..." />;
  }
  if (errorMessage) {
    return <ErrorState message={errorMessage} onRetry={loadPlan} />;
  }
  if (!data || data.milestones.length === 0) {
    return <ErrorState message="Este plan todavía no tiene hitos." />;
  }

  const allMilestonesDone = data.milestones.every((milestone) => milestone.status === 'done');

  return (
    <>
      <h1 className="text-2xl font-semibold">Tu plan hacia el crédito hipotecario</h1>
      <div className="mt-6">
        <MilestoneTimeline milestones={data.milestones} />
      </div>
      {allMilestonesDone && <ChecklistFinal />}
    </>
  );
}

export default function PlanPage({ params }: { params: { id: string } }): JSX.Element {
  return (
    <ProtectedRoute>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <PlanDetail planId={params.id} />
      </main>
    </ProtectedRoute>
  );
}

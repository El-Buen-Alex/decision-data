'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/auth/protected-route';
import { useAuth } from '@/auth/use-auth';
import { createPlan } from '@/api/underwriting-api';
import { ApiError } from '@/api/api-error';
import { LoadingState } from '@/components/state/loading-state';
import { ErrorState } from '@/components/state/error-state';

function CrearPlan(): JSX.Element {
  const { token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const simulationId = searchParams.get('simulationId');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    generatePlan();
  }, [token, simulationId, router]);

  async function generatePlan(): Promise<void> {
    if (!token || !simulationId) {
      return;
    }
    setErrorMessage(null);

    try {
      const result = await createPlan(token, simulationId);
      router.replace(`/plan/${result.plan.id}`);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo generar tu plan.';
      setErrorMessage(message);
    }
  }

  if (!simulationId) {
    return <ErrorState message="Falta el identificador de la simulación. Vuelve a intentarlo desde tu camino." />;
  }
  if (errorMessage) {
    return <ErrorState message={errorMessage} onRetry={generatePlan} />;
  }

  return <LoadingState label="Generando tu plan..." />;
}

export default function NuevoPlanPage(): JSX.Element {
  return (
    <ProtectedRoute>
      <main className="mx-auto max-w-2xl px-4 py-10">
        <CrearPlan />
      </main>
    </ProtectedRoute>
  );
}

'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/auth/protected-route';
import { useAuth } from '@/auth/use-auth';
import { createPlan } from '@/api/underwriting-api';
import { LoadingState } from '@/components/state/loading-state';

function CrearPlan(): JSX.Element {
  const { token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const simulationId = searchParams.get('simulationId');

  useEffect(() => {
    if (token && simulationId) {
      createPlan(token, simulationId).then((result) => router.replace(`/plan/${result.plan.id}`));
    }
  }, [token, simulationId, router]);

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

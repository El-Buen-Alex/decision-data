'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/auth/protected-route';
import { AppHeader } from '@/components/nav/app-header';
import { useAuth } from '@/auth/use-auth';
import { fetchRuleParameters, updateRuleParameter } from '@/api/underwriting-api';
import { RuleParameter } from '@/api/types';
import { ApiError } from '@/api/api-error';
import { LoadingState } from '@/components/state/loading-state';
import { ErrorState } from '@/components/state/error-state';
import { EmptyState } from '@/components/state/empty-state';
import { RuleParameterRow } from './rule-parameter-row';

function ReglasContent(): JSX.Element {
  const { token } = useAuth();
  const [parameters, setParameters] = useState<RuleParameter[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadParameters();
  }, [token]);

  async function loadParameters(): Promise<void> {
    if (!token) {
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await fetchRuleParameters(token);
      setParameters(result);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudieron cargar los parámetros.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave(key: string, value: number): Promise<void> {
    if (!token) {
      return;
    }
    const updated = await updateRuleParameter(token, key, value);
    setParameters((current) => current.map((parameter) => (parameter.key === key ? updated : parameter)));
  }

  if (isLoading) {
    return <LoadingState label="Cargando parámetros del motor de reglas..." />;
  }
  if (errorMessage) {
    return <ErrorState message={errorMessage} onRetry={loadParameters} />;
  }
  if (parameters.length === 0) {
    return <EmptyState message="No hay parámetros configurados todavía." />;
  }

  return (
    <div>
      {parameters.map((parameter) => (
        <RuleParameterRow key={parameter.id} parameter={parameter} onSave={handleSave} />
      ))}
    </div>
  );
}

export default function ReglasPage(): JSX.Element {
  return (
    <ProtectedRoute>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Panel de reglas de elegibilidad</h1>
        <p className="mt-2 text-fg-2">
          Cada parámetro tiene una fuente investigada. Editar un valor aquí afecta inmediatamente las próximas
          simulaciones — este es el panel para la modificación en vivo solicitada por el jurado.
        </p>
        <div className="mt-6">
          <ReglasContent />
        </div>
      </main>
    </ProtectedRoute>
  );
}

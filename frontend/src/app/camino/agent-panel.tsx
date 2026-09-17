'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/use-auth';
import { explainSimulation } from '@/api/agent-api';
import { ApiError } from '@/api/api-error';
import { LoadingState } from '@/components/state/loading-state';
import { ErrorState } from '@/components/state/error-state';

export function AgentPanel({ simulationId }: { simulationId: string }): JSX.Element {
  const { token } = useAuth();
  const [text, setText] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadExplanation();
  }, [token, simulationId]);

  async function loadExplanation(): Promise<void> {
    if (!token) {
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const reply = await explainSimulation(token, simulationId);
      setText(reply.text);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'El asesor no pudo generar una explicación.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <aside
      aria-label="Panel del asesor de IA"
      className="mt-6 rounded-xl border border-accent/40 bg-bg-2 p-4"
    >
      <p className="text-sm font-medium text-accent">Asesor</p>
      {isLoading && <LoadingState label="El asesor está preparando la explicación..." />}
      {errorMessage && <ErrorState message={errorMessage} onRetry={loadExplanation} />}
      {text && <p className="mt-2 text-fg-2">{text}</p>}
    </aside>
  );
}

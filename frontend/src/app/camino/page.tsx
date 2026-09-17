'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/auth/protected-route';
import { DiagnosticoPanel } from './diagnostico-panel';
import { SimuladorPanel } from './simulador-panel';
import { AgentPanel } from './agent-panel';
import { buttonVariants } from '@/components/ui/button';
import { SimulationResponse, CreditProfile, MortgageGoal } from '@/api/types';

interface DiagnosticoData {
  profile: CreditProfile;
  goal: MortgageGoal;
  simulation: SimulationResponse;
}

export default function CaminoPage(): JSX.Element {
  const [diagnosis, setDiagnosis] = useState<DiagnosticoData | null>(null);
  const [chosenSimulationId, setChosenSimulationId] = useState<string | null>(null);

  return (
    <ProtectedRoute>
      <main className="roadmap-path mx-auto max-w-2xl px-4 py-10 pl-10">
        <h1 className="text-2xl font-semibold">Tu camino hacia el crédito hipotecario</h1>
        <div className="mt-6">
          <DiagnosticoPanel onDiagnosed={setDiagnosis} />
        </div>
        {diagnosis && <AgentPanel simulationId={diagnosis.simulation.id} />}
        {diagnosis && <SimuladorPanel baseline={diagnosis} onSimulated={setChosenSimulationId} />}
        {chosenSimulationId && (
          <Link
            href={`/plan/nuevo?simulationId=${chosenSimulationId}`}
            className={buttonVariants({ className: 'mt-6' })}
          >
            Crear plan con este escenario
          </Link>
        )}
      </main>
    </ProtectedRoute>
  );
}

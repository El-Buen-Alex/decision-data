'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/auth/protected-route';
import { AppHeader } from '@/components/nav/app-header';
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

  // El escenario vigente es el último simulado por el usuario; si todavía no ha
  // usado el simulador, es el del diagnóstico inicial. Tanto el asesor como el
  // enlace al plan deben apuntar siempre al mismo escenario.
  const activeSimulationId = chosenSimulationId ?? diagnosis?.simulation.id ?? null;

  return (
    <ProtectedRoute>
      <AppHeader />
      <main className="roadmap-path mx-auto max-w-2xl px-4 py-10 pl-10">
        <h1 className="text-2xl font-semibold">Tu camino hacia el crédito hipotecario</h1>
        <div className="mt-6">
          <DiagnosticoPanel onDiagnosed={setDiagnosis} />
        </div>
        {activeSimulationId && <AgentPanel simulationId={activeSimulationId} />}
        {diagnosis && <SimuladorPanel baseline={diagnosis} onSimulated={setChosenSimulationId} />}
        {activeSimulationId && (
          <Link
            href={`/plan/nuevo?simulationId=${activeSimulationId}`}
            className={buttonVariants({ className: 'mt-6' })}
          >
            Crear plan con este escenario
          </Link>
        )}
      </main>
    </ProtectedRoute>
  );
}

'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/auth/protected-route';
import { DiagnosticoPanel } from './diagnostico-panel';
import { SimulationResponse, CreditProfile, MortgageGoal } from '@/api/types';

interface DiagnosticoData {
  profile: CreditProfile;
  goal: MortgageGoal;
  simulation: SimulationResponse;
}

export default function CaminoPage(): JSX.Element {
  const [diagnosis, setDiagnosis] = useState<DiagnosticoData | null>(null);

  return (
    <ProtectedRoute>
      <main className="roadmap-path mx-auto max-w-2xl px-4 py-10 pl-10">
        <h1 className="text-2xl font-semibold">Tu camino hacia el crédito hipotecario</h1>
        <div className="mt-6">
          <DiagnosticoPanel onDiagnosed={setDiagnosis} />
        </div>
        {diagnosis && <p className="mt-4 text-fg-2">El simulador aparecerá aquí (Task 7).</p>}
      </main>
    </ProtectedRoute>
  );
}

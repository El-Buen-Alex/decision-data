'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './use-auth';
import { LoadingState } from '../components/state/loading-state';

export function ProtectedRoute({ children }: { children: React.ReactNode }): JSX.Element {
  const { token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (token === null) {
      const storedToken = window.localStorage.getItem('decision-data-ruta-token');
      if (!storedToken) {
        router.push('/login');
      }
    }
  }, [token, router]);

  if (!token) {
    return <LoadingState label="Verificando sesión..." />;
  }

  return <>{children}</>;
}

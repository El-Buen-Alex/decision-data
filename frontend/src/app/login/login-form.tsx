'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/auth/use-auth';
import { ApiError } from '@/api/api-error';

export function LoginForm(): JSX.Element {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('ana.demo@decisiondata.test');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      router.push('/camino');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo iniciar sesión.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Formulario de inicio de sesión" className="flex flex-col gap-4">
      <label htmlFor="email">Correo</label>
      <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

      <label htmlFor="password">Contraseña</label>
      <Input
        id="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      {errorMessage && (
        <p role="alert" className="text-negative">
          {errorMessage}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Entrando...' : 'Entrar'}
      </Button>
    </form>
  );
}

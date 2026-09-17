import { LoginForm } from './login-form';

export default function LoginPage(): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold">Decision Data Ruta</h1>
      <p className="text-fg-2">Ingresa con el perfil demo para ver tu camino hacia el crédito hipotecario.</p>
      <LoginForm />
    </main>
  );
}

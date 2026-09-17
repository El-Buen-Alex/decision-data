'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/auth/use-auth';

const NAV_LINK_CLASS =
  'rounded-md px-1 py-0.5 text-fg-2 underline-offset-4 outline-none hover:text-fg hover:underline focus-visible:ring-2 focus-visible:ring-ring';

export function AppHeader(): JSX.Element {
  const { logout } = useAuth();
  const router = useRouter();

  function handleLogout(): void {
    logout();
    router.replace('/login');
  }

  return (
    <header className="border-b border-border bg-muted">
      <nav
        aria-label="Navegación principal"
        className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3"
      >
        <Link href="/camino" aria-label="Decision Data Ruta, ir a tu camino" className={NAV_LINK_CLASS}>
          <Image src="/brand/dd-lockup-white.png" alt="Decision Data" width={150} height={30} priority />
        </Link>

        <div className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <Link href="/camino" className={NAV_LINK_CLASS}>
            Mi camino
          </Link>
          <Link href="/reglas" className={NAV_LINK_CLASS}>
            Reglas
          </Link>
          <button type="button" onClick={handleLogout} className={NAV_LINK_CLASS}>
            Cerrar sesión
          </button>
        </div>
      </nav>
    </header>
  );
}

import { chromium, type FullConfig } from '@playwright/test';
import { DEMO_EMAIL, DEMO_PASSWORD } from './fixtures';

// Inicia sesión UNA sola vez para toda la corrida y guarda el estado (localStorage
// con el JWT) para que cada spec lo reutilice, en vez de volver a hacer login por
// cada test. /auth/login está protegido por rate limiting (20 req/60s) en el
// backend real — correcto para producción, pero una corrida completa de E2E que
// hiciera login en cada test lo agota y produce fallos intermitentes que no son
// bugs de la app.
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL ?? 'http://localhost:3000';
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(`${baseURL}/login`);
  await page.getByLabel('Correo').fill(DEMO_EMAIL);
  await page.getByLabel('Contraseña').fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForURL('**/camino');

  await page.context().storageState({ path: 'e2e/.auth/demo-user.json' });
  await browser.close();
}

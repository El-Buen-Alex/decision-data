import { type Page } from '@playwright/test';
export { test, expect } from '@playwright/test';

export const DEMO_EMAIL = 'ana.demo@decisiondata.test';
export const DEMO_PASSWORD = 'demo1234';

// Usada solo por global-setup.ts y por auth.spec.ts, que arrancan sin sesión
// (auth.spec.ts corre con storageState vacío — ver playwright.config.ts).
export async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Correo').fill(DEMO_EMAIL);
  await page.getByLabel('Contraseña').fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForURL('**/camino');
}

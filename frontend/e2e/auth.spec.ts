import { test, expect } from '@playwright/test';
import { login, DEMO_EMAIL } from './fixtures';

// Este archivo prueba el mecanismo de login/logout en sí, así que arranca sin la
// sesión global de global-setup.ts.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Autenticación', () => {
  test('una ruta protegida sin sesión redirige a /login', async ({ page }) => {
    await page.goto('/camino');
    await page.waitForURL('**/login');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('login con credenciales inválidas muestra un error visible', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo').fill(DEMO_EMAIL);
    await page.getByLabel('Contraseña').fill('password-incorrecta');
    await page.getByRole('button', { name: /entrar/i }).click();

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('login con credenciales válidas redirige a /camino y persiste la sesión al recargar', async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/camino$/);

    await page.reload();
    await expect(page).toHaveURL(/\/camino$/);
    await expect(page.getByRole('link', { name: /reglas/i })).toBeVisible();
  });

  test('logout limpia la sesión y vuelve a bloquear rutas protegidas', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: /cerrar sesión/i }).click();
    await page.waitForURL('**/login');

    await page.goto('/camino');
    await page.waitForURL('**/login');
  });

  test('/ redirige a un usuario autenticado a /camino', async ({ page }) => {
    await login(page);
    await page.goto('/');
    await page.waitForURL('**/camino');
  });
});

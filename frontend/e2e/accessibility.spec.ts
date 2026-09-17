import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';

test.describe('Accesibilidad (WCAG 2.1 AA vía axe-core)', () => {
  test('/login no tiene violaciones de accesibilidad', async ({ page }) => {
    await page.goto('/login');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test('/camino (con datos cargados) no tiene violaciones de accesibilidad', async ({ page }) => {
    await page.goto('/camino');
    await expect(page.getByRole('heading', { name: 'Hoy no calificarías' })).toBeVisible({ timeout: 15_000 });

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test('/reglas no tiene violaciones de accesibilidad', async ({ page }) => {
    await page.goto('/reglas');
    await expect(page.getByRole('heading', { name: 'Panel de reglas de elegibilidad' })).toBeVisible();
    await expect(page.getByLabel('Valor de MAX_HOUSING_DTI_RATIO')).toBeVisible({ timeout: 10_000 });

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test('el formulario de login es navegable por teclado', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo').focus();
    await expect(page.getByLabel('Correo')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Contraseña')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /entrar/i })).toBeFocused();
  });
});

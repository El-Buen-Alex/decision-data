import { test, expect } from './fixtures';

test.describe('Plan de hitos', () => {
  test('generar un plan desde un escenario que califica muestra tres hitos con fechas y texto legible', async ({
    page,
  }) => {
    await page.goto('/camino');
    await expect(page.getByRole('heading', { name: 'Hoy no calificarías' })).toBeVisible({ timeout: 15_000 });

    await page.getByLabel('Deuda mensual existente').fill('50');
    await page.getByLabel('Ingreso mensual').fill('1800');
    await page.getByLabel(/monto del préstamo/i).fill('60000');
    await page.getByRole('button', { name: 'Recalcular' }).click();
    await expect(page.getByText('Con este escenario, sí calificarías.')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('link', { name: 'Crear plan con este escenario' }).click();
    await page.waitForURL(/\/plan\/[0-9a-f-]+$/, { timeout: 15_000 });

    const timeline = page.getByRole('list', { name: 'Hitos del plan' });
    await expect(timeline.getByRole('listitem')).toHaveCount(3);

    // Regresión: los hitos deben mostrar texto legible, no la clave interna cruda
    // (p. ej. "housing_dti_ratio") que el backend nunca traduce.
    await expect(timeline).not.toContainText('housing_dti_ratio');
    await expect(timeline).not.toContainText('qualifies_today');
  });
});

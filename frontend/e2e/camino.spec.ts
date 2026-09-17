import { test, expect } from './fixtures';

test.describe('Camino — diagnóstico, simulador y agente', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/camino');
  });

  test('el diagnóstico inicial muestra que Ana hoy no calificaría, con números reales', async ({ page }) => {
    const diagnostico = page.getByRole('region', { name: 'Diagnóstico inicial' });
    await expect(diagnostico.getByRole('heading', { name: 'Hoy no calificarías' })).toBeVisible({ timeout: 15_000 });
    await expect(diagnostico).toContainText('Tu score es 640');
    await expect(diagnostico).toContainText('Probabilidad de aprobación:');
  });

  test('el panel del asesor de IA explica el diagnóstico con texto real (sin placeholders sin resolver)', async ({
    page,
  }) => {
    const agentPanel = page.getByRole('complementary', { name: 'Panel del asesor de IA' });
    await expect(agentPanel).toBeVisible();

    const explanation = agentPanel.locator('p').last();
    await expect(explanation).not.toHaveText('', { timeout: 20_000 });
    await expect(explanation).not.toContainText('{{');
  });

  test('el simulador recalcula en vivo y muestra las cifras detrás del veredicto', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Hoy no calificarías' })).toBeVisible({ timeout: 15_000 });

    await page.getByLabel('Deuda mensual existente').fill('50');
    await page.getByLabel('Ingreso mensual').fill('1800');
    await page.getByRole('button', { name: 'Recalcular' }).click();

    await expect(page.getByText(/sí calificarías|todavía no calificarías/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Cuota sobre tu ingreso')).toBeVisible();
    await expect(page.getByText('Financiamiento sobre el inmueble')).toBeVisible();
    await expect(page.getByText('Cuota mensual estimada')).toBeVisible();
  });

  test('tras recalcular, el panel del agente actualiza su explicación (no se queda con el escenario anterior)', async ({
    page,
  }) => {
    const agentPanel = page.getByRole('complementary', { name: 'Panel del asesor de IA' });
    const firstExplanation = agentPanel.locator('p').last();
    await expect(firstExplanation).not.toHaveText('', { timeout: 20_000 });
    const originalText = await firstExplanation.textContent();

    await page.getByLabel('Deuda mensual existente').fill('50');
    await page.getByLabel('Ingreso mensual').fill('1800');
    await page.getByRole('button', { name: 'Recalcular' }).click();

    await expect(page.getByText(/sí calificarías|todavía no calificarías/)).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(async () => agentPanel.locator('p').last().textContent(), { timeout: 20_000 })
      .not.toBe(originalText);
  });

  test('el enlace para crear el plan aparece ya con el diagnóstico inicial y apunta al escenario vigente', async ({
    page,
  }) => {
    const planLink = page.getByRole('link', { name: 'Crear plan con este escenario' });
    await expect(planLink).toBeVisible({ timeout: 15_000 });

    const initialHref = await planLink.getAttribute('href');
    expect(initialHref).toMatch(/\/plan\/nuevo\?simulationId=/);

    await page.getByLabel('Deuda mensual existente').fill('50');
    await page.getByLabel('Ingreso mensual').fill('1800');
    await page.getByRole('button', { name: 'Recalcular' }).click();
    await expect(page.getByText(/sí calificarías|todavía no calificarías/)).toBeVisible({ timeout: 15_000 });

    await expect
      .poll(async () => planLink.getAttribute('href'), { timeout: 10_000 })
      .not.toBe(initialHref);
  });
});

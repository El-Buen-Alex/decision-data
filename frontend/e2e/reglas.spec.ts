import { test, expect } from './fixtures';

test.describe('Panel de reglas (modificación en vivo)', () => {
  test('editar un parámetro se guarda y persiste tras recargar la página', async ({ page }) => {
    await page.goto('/reglas');
    await expect(page.getByRole('heading', { name: 'Panel de reglas de elegibilidad' })).toBeVisible();

    const input = page.getByLabel('Valor de MAX_HOUSING_DTI_RATIO');
    await expect(input).toBeVisible({ timeout: 10_000 });
    // "border-b" es la clase propia de la fila (RuleParameterRow), a diferencia de
    // un `div` genérico que también matchearía divs contenedores ancestros con
    // los 12 botones "Guardar" de todas las filas.
    const row = page.locator('div.border-b').filter({ has: input });
    const saveButton = row.getByRole('button', { name: 'Guardar' });

    await input.fill('0.42');
    await saveButton.click();
    await expect(saveButton).toHaveText('Guardar', { timeout: 10_000 });

    await page.reload();
    const inputAfterReload = page.getByLabel('Valor de MAX_HOUSING_DTI_RATIO');
    // El backend guarda el valor como decimal(10,4) y lo devuelve con ceros de
    // relleno ("0.4200"), no el "0.42" que el usuario escribió — comportamiento
    // real y esperado del backend, no un error del test.
    await expect(inputAfterReload).toHaveValue('0.4200', { timeout: 10_000 });

    // Deja el parámetro como estaba para no afectar otras pruebas del mismo run.
    const rowAfterReload = page.locator('div.border-b').filter({ has: inputAfterReload });
    await inputAfterReload.fill('0.40');
    await rowAfterReload.getByRole('button', { name: 'Guardar' }).click();
  });

  test('un valor inválido muestra un error visible y no llega a enviarse', async ({ page }) => {
    await page.goto('/reglas');
    const input = page.getByLabel('Valor de MAX_HOUSING_DTI_RATIO');
    await expect(input).toBeVisible({ timeout: 10_000 });
    const row = page.locator('div.border-b').filter({ has: input });

    await input.fill('');
    await row.getByRole('button', { name: 'Guardar' }).click();

    await expect(row.getByRole('alert')).toBeVisible();
    // Regresión: un valor vacío debe rechazarse en el cliente con un mensaje en
    // español, no llegar al backend y mostrar su mensaje de validación en inglés.
    await expect(row.getByRole('alert')).toContainText('número válido');
  });
});

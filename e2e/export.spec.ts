import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { controleerScherm, importeer, voorbeeld } from './helpers';

test('logs exporteren als tekst en als JSON', async ({ page, context }, info) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await importeer(page, voorbeeld('bibliotheek.json'));
  await importeer(page, voorbeeld('logs.json'));
  await page.goto('#/data');
  await page.getByRole('button', { name: 'Alles', exact: true }).click();
  await page.getByRole('button', { name: 'Tekst voor review kopiëren' }).click();
  const tekst = page.locator('textarea.export-tekst');
  await expect(tekst).toHaveValue(/Emerge-trainingslog 2026-09-03 – 2026-09-06 \(2 sessies\)/);
  await expect(tekst).toHaveValue(/Per oefening/);
  await tekst.scrollIntoViewIfNeeded();
  await controleerScherm(page, 'export', info.project.name);

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'JSON downloaden' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^emerge-logs-\d{4}-\d{2}-\d{2}\.json$/);
  const inhoud = JSON.parse(readFileSync(await download.path(), 'utf8'));
  expect(inhoud).toMatchObject({ soort: 'logs', schemaVersie: 3 });
  expect(inhoud.sessies).toHaveLength(2);
});

test('lege periode: melding in plaats van een leeg bestand', async ({ page }) => {
  await page.goto('#/data');
  await page.getByRole('button', { name: 'JSON downloaden' }).click();
  await expect(page.getByText('Geen sessies in deze periode.')).toBeVisible();
});

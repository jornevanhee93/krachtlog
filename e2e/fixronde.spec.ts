import { expect, test, type Page } from '@playwright/test';
import { controleerScherm, importeer, sluitMeldingen, voorbeeld } from './helpers';

// Fixronde 17 okt: de fouten uit de handmatige test, op 375 × 812 in licht en donker. Alle data is verzonnen.

async function accepteerDialogen(page: Page) {
  page.on('dialog', (d) => void d.accept());
}

async function legeSessieMet(page: Page, naam: RegExp) {
  await page.goto('#/');
  await sluitMeldingen(page);
  await page.getByRole('button', { name: /Lege sessie/ }).click();
  await page.getByRole('button', { name: '+ Oefening toevoegen' }).click();
  await page.getByRole('dialog').getByRole('button', { name: naam }).click();
}

test('1. vervangen na een gedane set: de gedane set blijft bewaard', async ({ page }, info) => {
  await accepteerDialogen(page);
  await importeer(page, voorbeeld('bibliotheek.json'));
  await legeSessieMet(page, /Kettlebell swing/);
  await page.getByRole('button', { name: 'Set klaar' }).click();
  await page.getByRole('button', { name: 'Overslaan' }).click();
  await page.getByRole('button', { name: 'Vervangen' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Box jump/ }).click();

  const kaarten = page.getByTestId('exercise-card');
  await expect(kaarten).toHaveCount(2);
  await expect(kaarten.nth(0)).toContainText('Kettlebell swing');
  await expect(kaarten.nth(0)).toContainText('vervangen');
  await expect(kaarten.nth(0)).toContainText('1/1');
  await expect(kaarten.nth(1)).toContainText('Box jump');
  await expect(page.locator('.exercise-card.open')).toContainText('Box jump');
  await controleerScherm(page, 'fix1-vervangen', info.project.name);

  await page.getByRole('button', { name: 'Sessie afsluiten' }).click();
  await page.getByRole('button', { name: 'Sessie bewaren' }).click();
  await expect(page).toHaveURL(/#\/historiek\//);
  await expect(page.getByText('Kettlebell swing')).toBeVisible();
});

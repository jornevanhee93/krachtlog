import { expect, test, type Page } from '@playwright/test';
import { controleerScherm, importeer, sluitMeldingen, voorbeeld } from './helpers';

// Donderdag 29 oktober 2026, 10:00. Het voorbeeldprogramma start maandag 26 oktober.
async function opDatum(page: Page, iso: string) {
  await page.clock.install({ time: new Date(iso) });
}

test.beforeEach(async ({ page }) => {
  await opDatum(page, '2026-10-29T10:00:00');
  await importeer(page, voorbeeld('bibliotheek.json'));
  await importeer(page, voorbeeld('programma.json'));
  await page.goto('#/');
  await sluitMeldingen(page);
});

test('vandaag: gemiste sessie en de geplande sessie van vandaag', async ({ page }, info) => {
  await expect(page.getByTestId('gemist')).toContainText('Sessie A');
  await expect(page.getByText('Gepland vandaag')).toBeVisible();
  await controleerScherm(page, 'vandaag-plan', info.project.name);
});

test('inhalen geeft de 48u-waarschuwing en zet de sessie op ingehaald', async ({ page }) => {
  let melding = '';
  page.once('dialog', (d) => {
    melding = d.message();
    void d.accept();
  });
  await page.getByTestId('gemist').getByRole('button', { name: 'Inhalen' }).click();
  await expect(page).toHaveURL(/#\/training/);
  expect(melding).toMatch(/minder dan 48 uur/);
  expect(melding).toMatch(/Sessie B staat over [89] uur gepland/);

  // Eén set afvinken en afsluiten.
  await page.getByRole('button', { name: 'Set klaar' }).first().click();
  await page.getByRole('button', { name: 'Sessie afsluiten' }).click();
  await page.getByRole('button', { name: 'Sessie bewaren' }).click();
  await expect(page).toHaveURL(/#\/historiek\//);

  await page.goto('#/programmas');
  await page.getByRole('link', { name: /Voorbeeldprogramma/ }).click();
  await expect(page.getByRole('link', { name: /Sessie A.*ingehaald/ })).toBeVisible();
  await page.goto('#/');
  await expect(page.getByTestId('gemist')).toHaveCount(0);
  await expect(page.getByText('Gepland vandaag')).toBeVisible();
});

test('overslaan: de gemiste sessie verdwijnt, de rest blijft staan', async ({ page }) => {
  page.once('dialog', (d) => void d.accept());
  await page.getByTestId('gemist').getByRole('button', { name: 'Overslaan' }).click();
  await expect(page.getByTestId('gemist')).toHaveCount(0);
  await expect(page.getByText('Gepland vandaag')).toBeVisible();
});

test('geplande sessie aanpassen: oefening verwijderen en terug naar het plan', async ({ page }, info) => {
  await page.getByRole('link', { name: 'Aanpassen' }).click();
  await expect(page.getByRole('heading', { name: 'Sessie B' })).toBeVisible();
  await expect(page.locator('.planned-item')).toHaveCount(3);
  await page.getByRole('button', { name: 'Verwijderen: Copenhagen plank' }).click();
  await expect(page.locator('.planned-item')).toHaveCount(2);
  await controleerScherm(page, 'gepland-aanpassen', info.project.name);
  await page.getByRole('button', { name: 'Terug naar het plan' }).click();
  await expect(page.locator('.planned-item')).toHaveCount(3);

  // Starten vanuit de geplande sessie: de training heeft de naam van de sessie.
  await page.getByRole('button', { name: 'Start deze sessie' }).click();
  await expect(page.getByRole('heading', { name: 'Sessie B' })).toBeVisible();
});

test('programma-overzicht toont weken, datums en status', async ({ page }, info) => {
  await page.getByRole('link', { name: "Programma's" }).click();
  await page.getByRole('link', { name: /Voorbeeldprogramma/ }).click();
  await expect(page.getByText('Blok 1: opbouw · week 1 · Opbouw')).toBeVisible();
  await expect(page.getByText('Blok 2: intensief · week 6 · Deload')).toBeVisible();
  await controleerScherm(page, 'programma', info.project.name);
});

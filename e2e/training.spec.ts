import { expect, test } from '@playwright/test';
import { controleerScherm, importeer, sluitMeldingen, voorbeeld } from './helpers';

test.beforeEach(async ({ page }) => {
  await importeer(page, voorbeeld('bibliotheek.json'));
  await importeer(page, voorbeeld('logs.json'));
  await page.goto('#/');
  await sluitMeldingen(page);
  await page.getByRole('button', { name: /Voorbeeld sessie A/ }).click();
  await expect(page).toHaveURL(/#\/training/);
});

test('accordeon: één kaart open, tik opent een andere, tik op de open kaart klapt dicht', async ({ page }, info) => {
  const kaarten = page.getByTestId('exercise-card');
  await expect(kaarten.first()).toHaveClass(/open/);
  await expect(page.locator('.exercise-card.open')).toHaveCount(1);
  await controleerScherm(page, 'accordeon-start', info.project.name);

  await page.getByRole('button', { name: 'Box jump openklappen' }).click();
  await expect(page.locator('.exercise-card.open')).toHaveCount(1);
  await expect(page.locator('.exercise-card.open')).toContainText('Box jump');

  await page.getByRole('button', { name: 'Box jump dichtklappen' }).click();
  await expect(page.locator('.exercise-card.open')).toHaveCount(0);
  await controleerScherm(page, 'accordeon-dicht', info.project.name);
});

test('superset: na een set gaat de volgende oefening open, klok blijft zichtbaar', async ({ page }) => {
  await page.getByRole('button', { name: 'Set klaar' }).click();
  await expect(page.locator('.exercise-card.open')).toContainText('Single-leg RDL');
  await expect(page.locator('.training-head .clock')).toBeInViewport();
  await expect(page.locator('.rest-bar')).toBeVisible();
  // De dichte pull-up-kaart toont de voortgang en de laatste set.
  const pullup = page.getByTestId('exercise-card').filter({ hasText: 'Pull-up' });
  await expect(pullup).toContainText('1/3');
  await expect(pullup.locator('.exercise-sub')).toContainText('kg');
});

test('overzichtspaneel: open via de naam, klok en timer lopen door, sluiten met knop en veeg', async ({ page }, info) => {
  await page.getByRole('button', { name: 'Set klaar' }).click();
  await page.getByRole('button', { name: 'Overzicht: Pull-up' }).click();
  const paneel = page.getByRole('dialog', { name: /Pull-up/ });
  await expect(paneel).toBeVisible();
  await expect(paneel).toContainText('Ladder');
  await expect(paneel.locator('.ladder li.current')).toHaveCount(1);
  await expect(paneel).toContainText('Laatste 3 keer');
  await expect(page.locator('.rest-bar')).toBeVisible();
  await page.waitForTimeout(300);
  await controleerScherm(page, 'paneel', info.project.name);
  await paneel.getByRole('button', { name: 'Sluiten' }).click();
  await expect(paneel).toHaveCount(0);

  // Veeg omlaag op de kop van het paneel.
  await page.getByRole('button', { name: 'Overzicht: Pull-up' }).click();
  const kop = page.locator('.panel-head');
  const box = (await kop.boundingBox())!;
  await kop.dispatchEvent('touchstart', { touches: [{ identifier: 1, clientX: box.x + 50, clientY: box.y + 10 }] });
  await kop.dispatchEvent('touchmove', { touches: [{ identifier: 1, clientX: box.x + 50, clientY: box.y + 200 }] });
  await kop.dispatchEvent('touchend', { touches: [] });
  await expect(page.getByRole('dialog', { name: /Pull-up/ })).toHaveCount(0);
});

test('overzichtspaneel vanuit de oefeningenlijst, met knop Bewerken', async ({ page }) => {
  await page.goto('#/oefeningen');
  await page.getByRole('button', { name: /Pull-up/ }).click();
  const paneel = page.getByRole('dialog', { name: /Pull-up/ });
  await expect(paneel).toBeVisible();
  await paneel.getByRole('button', { name: 'Bewerken' }).click();
  await expect(page).toHaveURL(/#\/oefeningen\/oef-pull-up/);
});

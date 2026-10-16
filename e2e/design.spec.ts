import { expect, test } from '@playwright/test';
import { controleerScherm, importeer, voorbeeld } from './helpers';

const SCHERMEN = ['', 'oefeningen', 'sjablonen', 'materiaal', 'historiek', 'data', 'oefeningen/nieuw', 'sjablonen/nieuw', 'materiaal/nieuw'];

test('lege app: elk scherm past op 375px en is puur zwart-wit', async ({ page }, info) => {
  for (const s of SCHERMEN) {
    await page.goto(`#/${s}`);
    await page.waitForTimeout(150);
    await controleerScherm(page, `leeg-${s.replace('/', '-') || 'vandaag'}`, info.project.name);
  }
});

test('met bibliotheek en logs: lijsten, bewerken en training', async ({ page }, info) => {
  await importeer(page, voorbeeld('bibliotheek.json'));
  await importeer(page, voorbeeld('logs.json'));
  for (const s of ['oefeningen', 'sjablonen', 'materiaal', 'historiek']) {
    await page.goto(`#/${s}`);
    await page.waitForTimeout(150);
    await controleerScherm(page, `vol-${s}`, info.project.name);
  }
  await page.goto('#/oefeningen/oef-box-jump');
  await controleerScherm(page, 'oefening-bewerken', info.project.name);
  await page.locator('.icon-picker').scrollIntoViewIfNeeded();
  await page.locator('.icon-picker').screenshot({ path: `e2e/screenshots/${info.project.name}-iconen.png` });
  await page.goto('#/oefeningen');
  await page.waitForTimeout(150);
  await page.screenshot({ path: `e2e/screenshots/${info.project.name}-lijst-iconen.png` });

  await page.goto('#/');
  await page.locator('.list-item').first().click();
  await expect(page).toHaveURL(/#\/training/);
  await page.waitForTimeout(200);
  await controleerScherm(page, 'training', info.project.name);
});

test('lege naam geeft één melding', async ({ page }) => {
  await page.goto('#/oefeningen/nieuw');
  await page.getByRole('button', { name: 'Bewaren' }).click();
  await expect(page.getByText('Geef een naam.')).toHaveCount(1);
});

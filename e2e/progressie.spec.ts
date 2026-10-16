import { expect, test } from '@playwright/test';
import { controleerScherm, importeer, voorbeeld } from './helpers';

test('overzichtspaneel toont het voorstel en de grafieken', async ({ page }, info) => {
  await importeer(page, voorbeeld('bibliotheek.json'));
  await importeer(page, voorbeeld('logs.json'));
  await page.goto('#/oefeningen');
  await page.getByRole('button', { name: /Pull-up/ }).click();
  const paneel = page.getByRole('dialog', { name: /Pull-up/ });
  await expect(paneel).toContainText('Volgende keer');
  await expect(paneel).toContainText('Verloop');
  await expect(paneel.locator('.chart').first()).toBeVisible();
  await page.waitForTimeout(400);
  await paneel.locator('.panel-body').evaluate((el) => (el.scrollTop = 0));
  await controleerScherm(page, 'paneel-voorstel', info.project.name);
  await paneel.locator('.charts').scrollIntoViewIfNeeded();
  await controleerScherm(page, 'paneel-grafieken', info.project.name);
});

test('training toont het doel van vandaag', async ({ page }) => {
  await importeer(page, voorbeeld('bibliotheek.json'));
  await importeer(page, voorbeeld('logs.json'));
  await page.goto('#/');
  await page.getByRole('button', { name: /Voorbeeld sessie A/ }).click();
  await expect(page.locator('.exercise-card.open')).toContainText('Vandaag:');
});

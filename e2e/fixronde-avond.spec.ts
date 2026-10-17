import { expect, test, type Page } from '@playwright/test';
import { controleerScherm, importeer, sluitMeldingen } from './helpers';

// Fixronde 17 okt avond, op 375 × 812 in licht en donker. Alle data is verzonnen.

const bibliotheek = {
  schemaVersie: 5,
  soort: 'bibliotheek',
  oefeningen: [
    {
      id: 'bj',
      naam: 'Box jump',
      metingen: ['extraLast', 'reps'],
      progressie: { modus: 'ladder', profiel: 'power', repBereik: { min: 3, max: 3 }, treden: [{ label: '24 inch', last: { variant: '24 inch' } }] },
    },
    { id: 'kb', naam: 'KB swing', metingen: ['gewicht', 'reps'] },
    {
      id: 'chin',
      naam: 'Chin-up',
      metingen: ['extraLast', 'reps'],
      progressie: {
        modus: 'ladder',
        repBereik: { min: 6, max: 8 },
        doelRIR: 2,
        treden: [
          { label: 'BW', last: { variant: 'BW' } },
          { label: 'Vest 5', last: { extraKg: 5 } },
          { label: 'Vest 10', last: { extraKg: 10 } },
        ],
        huidigeTrede: 'BW',
      },
    },
  ],
  sjablonen: [
    {
      id: 'sj-power',
      naam: 'Testsessie power',
      groepen: [
        {
          label: 'A',
          type: 'superset',
          rondes: 3,
          rustTussenRondesSec: 90,
          items: [
            { oefeningId: 'bj', repBereik: { min: 3, max: 3 }, last: { variant: '24 inch', extraKg: 10 } },
            { oefeningId: 'kb', repBereik: { min: 10, max: 10 }, last: { gewichtKg: 16 } },
          ],
        },
      ],
    },
  ],
};

const snelleKnop = (page: Page) => page.locator('.exercise-card.open .snel-knop');

test('1. de vervanger krijgt zijn eigen voorschrift, niet de last en reps van de oude oefening', async ({ page }, info) => {
  page.on('dialog', (d) => void d.accept());
  await importeer(page, JSON.stringify(bibliotheek));
  await page.goto('#/');
  await sluitMeldingen(page);
  await page.getByRole('button', { name: /Testsessie power/ }).click();
  await expect(page).toHaveURL(/#\/training/);

  const kaarten = page.getByTestId('exercise-card');
  await expect(page.locator('.exercise-card.open')).toContainText('Box jump');
  await expect(snelleKnop(page)).toContainText('+10 kg × 3');
  await snelleKnop(page).click();
  await expect(page.locator('.exercise-card.open')).toContainText('KB swing');

  // Box jump opnieuw openen en vervangen door Chin-up.
  await page.getByRole('button', { name: 'Box jump openklappen' }).click();
  await expect(page.locator('.exercise-card.open')).toContainText('Box jump');
  await page.getByRole('button', { name: 'Vervangen' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Chin-up/ }).click();

  await expect(kaarten).toHaveCount(3);
  const open = page.locator('.exercise-card.open');
  await expect(open).toContainText('Chin-up');
  await expect(snelleKnop(page)).toHaveText('✓ BW · 6 · RIR 2');
  await expect(open.locator('.set-list')).not.toContainText('10 kg');
  await expect(open.locator('.set-list')).not.toContainText('× 3');
  await controleerScherm(page, 'avond1-vervanger', info.project.name);

  // Een tik logt een chin-up op lichaamsgewicht × 6.
  await snelleKnop(page).click();
  await page.getByRole('button', { name: 'Sessie afsluiten' }).click();
  await page.getByRole('button', { name: 'Sessie bewaren' }).click();
  await expect(page).toHaveURL(/#\/historiek\//);
  await expect(page.locator('main')).toContainText('Chin-up');
  await expect(page.locator('main')).toContainText('BW · 6 · RIR 2');
});

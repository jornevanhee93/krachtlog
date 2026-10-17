import { expect, test, type Page } from '@playwright/test';
import { controleerScherm, importeer, sluitMeldingen } from './helpers';

// Fixronde 17 okt laat, op 375 × 812 in licht en donker. Alle data is verzonnen.
// Een tijds- of afstandsoefening zonder vorige keer start op de onderkant van haar eigen bereik, nooit op 0 s of 0 m.

const bibliotheek = {
  schemaVersie: 5,
  soort: 'bibliotheek',
  oefeningen: [
    {
      id: 'sh',
      naam: 'Suitcase hold',
      metingen: ['gewicht', 'tijd'],
      unilateraal: true,
      progressie: {
        modus: 'ladder',
        profiel: 'isometrisch',
        duurBereikSec: { min: 30, max: 45 },
        treden: [{ label: '24 kg', last: { gewichtKg: 24 } }],
      },
    },
    {
      id: 'fc',
      naam: 'Farmer carry',
      metingen: ['gewicht', 'afstand'],
      progressie: { modus: 'last', profiel: 'carry', afstandBereikM: { min: 20, max: 40 } },
    },
    { id: 'pl', naam: 'Plank', metingen: ['tijd'] },
    { id: 'kb', naam: 'KB swing', metingen: ['gewicht', 'reps'] },
  ],
  sjablonen: [
    {
      id: 'sj-hold',
      naam: 'Testsessie hold',
      groepen: [{ label: 'A', type: 'enkel', items: [{ oefeningId: 'sh', sets: 2 }] }],
    },
  ],
};

const open = (page: Page) => page.locator('.exercise-card.open');
const snelleKnop = (page: Page) => page.locator('.exercise-card.open .snel-knop');

async function start(page: Page, knop: RegExp) {
  await importeer(page, JSON.stringify(bibliotheek));
  await page.goto('#/');
  await sluitMeldingen(page);
  await page.getByRole('button', { name: knop }).click();
  await expect(page).toHaveURL(/#\/training/);
}

test('1. uit een sjabloon: een unilaterale hold start op L30/R30 s, niet op 0 s', async ({ page }, info) => {
  await start(page, /Testsessie hold/);
  await expect(open(page)).toContainText('Suitcase hold');
  await expect(open(page)).toContainText('Vandaag: 24 kg · 30 s');
  await expect(snelleKnop(page)).toHaveText('✓ 24 kg · L30/R30 s');
  await expect(open(page).locator('.set-list')).not.toContainText('L0');
  await controleerScherm(page, 'laat1-hold', info.project.name);

  await snelleKnop(page).click();
  await page.getByRole('button', { name: 'Sessie afsluiten' }).click();
  await page.getByRole('button', { name: 'Sessie bewaren' }).click();
  await expect(page).toHaveURL(/#\/historiek\//);
  await expect(page.locator('main')).toContainText('24 kg · L30/R30 s');
});

test('2. toevoegen en vervangen: carry op 20 m, zonder bereik een lege duur', async ({ page }, info) => {
  await start(page, /Lege sessie/);

  // Carry: de onderkant van het afstandsbereik.
  await page.getByRole('button', { name: '+ Oefening toevoegen' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Farmer carry/ }).click();
  await expect(open(page)).toContainText('Vandaag: 20 m');
  await expect(snelleKnop(page)).toHaveText('✓ 20 m');

  // KB swing vervangen door de hold: de vervanger start op zijn eigen onderkant.
  await page.getByRole('button', { name: '+ Oefening toevoegen' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /KB swing/ }).click();
  await expect(open(page)).toContainText('KB swing');
  await page.getByRole('button', { name: 'Vervangen' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Suitcase hold/ }).click();
  await expect(open(page)).toContainText('Suitcase hold');
  await expect(snelleKnop(page)).toHaveText('✓ 24 kg · L30/R30 s');

  // Plank zonder bereik: geen 0 s, de knop logt niets maar opent het invulblok.
  await page.getByRole('button', { name: '+ Oefening toevoegen' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Plank/ }).click();
  await expect(open(page)).toContainText('Plank');
  await expect(snelleKnop(page)).toHaveText('Vul de duur in');
  await expect(open(page)).not.toContainText('0 s');
  await controleerScherm(page, 'laat2-plank', info.project.name);
  await snelleKnop(page).click();
  const duur = open(page).getByRole('textbox', { name: 'Tijd' }).or(open(page).getByRole('spinbutton', { name: 'Tijd' }));
  await expect(duur).toHaveValue('');
  await expect(open(page).locator('.badge')).toHaveText('0/3');
  await duur.fill('40');
  await page.getByRole('button', { name: 'Inklappen' }).click();
  await expect(snelleKnop(page)).toHaveText('✓ 40 s');
  await snelleKnop(page).click();
  await expect(open(page).locator('.badge')).toHaveText('1/3');
  // De volgende set heeft nog geen duur: opnieuw invullen, geen set van 0 s.
  await expect(snelleKnop(page)).toHaveText('Vul de duur in');
});

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

test('2. programma-import: een gelijkaardige naam wordt gevraagd, niet stil gekoppeld', async ({ page }, info) => {
  await importeer(
    page,
    JSON.stringify({ schemaVersie: 3, soort: 'bibliotheek', oefeningen: [{ id: 'cd', naam: 'Copenhagen dips', aliassen: ['Copenhagen'] }] }),
  );
  const programma = {
    schemaVersie: 3,
    soort: 'programma',
    oefeningen: [{ id: 'cp', naam: 'Copenhagen plank', aliassen: ['Copenhagen'] }],
    programma: {
      id: 'p',
      naam: 'Testprogramma',
      startDatum: '2026-10-26',
      blokken: [{ naam: 'Blok', weken: [{ sessies: [{ naam: 'A', weekdag: 'ma', groepen: [{ items: [{ oefeningId: 'cp' }] }] }] }] }],
    },
  };
  await page.goto('#/data');
  await page.getByRole('textbox').first().fill(JSON.stringify(programma));
  await page.getByRole('button', { name: 'Controleren' }).click();
  await expect(page.getByText('Is dit dezelfde oefening?')).toBeVisible();
  await expect(page.getByText('Koppelen aan "Copenhagen dips"')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Importeren', exact: true })).toBeDisabled();
  await controleerScherm(page, 'fix2-twijfel', info.project.name);
  await page.getByText('Nieuwe oefening').click();
  await page.getByRole('button', { name: 'Importeren', exact: true }).click();
  await expect(page.getByText('Import klaar.')).toBeVisible();
  await page.goto('#/oefeningen');
  await expect(page.locator('.list-item')).toHaveCount(2);
});

test('3. bewaar als sjabloon: volledige structuur en geen dubbele naam', async ({ page }, info) => {
  await accepteerDialogen(page);
  await importeer(page, voorbeeld('bibliotheek.json'));
  await page.goto('#/');
  await sluitMeldingen(page);
  await page.getByRole('button', { name: /Voorbeeld sessie A/ }).click();
  await expect(page).toHaveURL(/#\/training/);
  await page.getByRole('button', { name: 'Set klaar' }).click();

  await page.getByRole('button', { name: 'Sessie afsluiten' }).click();
  await page.getByText('Bewaar als sjabloon').click();
  const naam = page.getByRole('textbox', { name: 'Naam van het sjabloon' });
  await expect(naam).toHaveValue('Voorbeeld sessie A (aangepast)');
  // Typ je toch een bestaande naam, dan vraagt de app: nieuw of vervangen.
  await naam.fill('Voorbeeld sessie A');
  await expect(page.getByText('Er bestaat al een sjabloon met deze naam.')).toBeVisible();
  await expect(page.getByLabel('Nieuw sjabloon: "Voorbeeld sessie A (aangepast)"')).toBeChecked();
  await controleerScherm(page, 'fix3-sjabloon', info.project.name);
  await page.getByRole('button', { name: 'Sessie bewaren' }).click();
  await expect(page).toHaveURL(/#\/historiek\//);

  await page.goto('#/sjablonen');
  const rijen = page.locator('.list-item');
  await expect(rijen).toHaveCount(2);
  await expect(rijen.nth(0)).toContainText('Voorbeeld sessie A');
  await expect(rijen.nth(1)).toContainText('Voorbeeld sessie A (aangepast)');
  await expect(rijen.nth(1)).toContainText('4 groepen · 6 oefeningen');
});

test('8. unilateraal met tijd: links en rechts apart', async ({ page }, info) => {
  await accepteerDialogen(page);
  await importeer(page, voorbeeld('bibliotheek.json'));
  await legeSessieMet(page, /Copenhagen plank/);
  await page.getByRole('textbox', { name: 'Tijd links' }).fill('30');
  await page.getByRole('textbox', { name: 'Tijd rechts' }).fill('25');
  await controleerScherm(page, 'fix8-per-kant', info.project.name);
  await page.getByRole('button', { name: 'Set klaar' }).click();
  await page.getByRole('button', { name: 'Overslaan' }).click();
  await page.getByRole('button', { name: 'Sessie afsluiten' }).click();
  await page.getByRole('button', { name: 'Sessie bewaren' }).click();
  await expect(page).toHaveURL(/#\/historiek\//);
  await expect(page.getByText(/L30\/R25 s/)).toBeVisible();
});

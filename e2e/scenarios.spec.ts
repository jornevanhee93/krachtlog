import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { controleerScherm, importeer, sluitMeldingen, voorbeeld } from './helpers';

// Eindtest: de scenario's uit de werklijst, op 375 × 812 in licht en donker. Alle data is verzonnen.

async function accepteerDialogen(page: Page) {
  page.on('dialog', (d) => void d.accept());
}

test('ad-hocsessie: oefening toevoegen, opwarmset, per kant, vervangen, verwijderen, afsluiten als sjabloon', async ({ page }, info) => {
  await accepteerDialogen(page);
  await importeer(page, voorbeeld('bibliotheek.json'));
  await page.goto('#/');
  await sluitMeldingen(page);
  await page.getByRole('button', { name: /Lege sessie/ }).click();
  await expect(page).toHaveURL(/#\/training/);

  // Toevoegen: Single-leg RDL (per kant).
  await page.getByRole('button', { name: '+ Oefening toevoegen' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Single-leg RDL/ }).click();
  await expect(page.getByText('Links', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Rechts', { exact: false }).first()).toBeVisible();

  // Opwarmset toevoegen en afvinken: geen rusttimer, daarna inklapbaar.
  await page.getByRole('button', { name: '+ Opwarmset' }).click();
  await expect(page.getByText('Opwarmset', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Set klaar' }).click();
  await expect(page.locator('.rest-bar')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /1 opwarmset/ })).toBeVisible();

  // Werkset: links 10, rechts 9, RIR 2.
  await page.getByRole('textbox', { name: 'Links' }).fill('10');
  await page.getByRole('textbox', { name: 'Rechts' }).fill('9');
  await page.getByRole('group', { name: 'RIR' }).getByRole('button', { name: '2' }).click();
  await page.getByRole('button', { name: 'Set klaar' }).click();
  await expect(page.locator('.rest-bar')).toBeVisible();
  await page.getByRole('button', { name: 'Overslaan' }).click();
  await expect(page.locator('.rest-bar')).toHaveCount(0);

  // Tweede oefening toevoegen, vervangen en een derde verwijderen.
  await page.getByRole('button', { name: '+ Oefening toevoegen' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Box jump/ }).click();
  await page.getByRole('button', { name: 'Vervangen' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Kettlebell swing/ }).click();
  await expect(page.locator('.exercise-card.open')).toContainText('Kettlebell swing');
  await page.getByRole('button', { name: '+ Oefening toevoegen' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Farmer carry/ }).click();
  await page.getByRole('button', { name: 'Verwijderen', exact: true }).click();
  await expect(page.getByTestId('exercise-card')).toHaveCount(2);
  await controleerScherm(page, 'adhoc', info.project.name);

  // Afsluiten met RPE, plezier en als sjabloon bewaren.
  await page.getByRole('button', { name: 'Sessie afsluiten' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '7', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '4 ★' }).click();
  await page.getByText('Bewaar als sjabloon').click();
  await page.getByRole('textbox', { name: 'Naam van het sjabloon' }).fill('Mijn ad-hocsessie');
  await page.getByRole('button', { name: 'Sessie bewaren' }).click();
  await expect(page).toHaveURL(/#\/historiek\//);
  await expect(page.getByText(/L10\/R9/)).toBeVisible();
  await expect(page.getByText(/opwarmset/)).toBeVisible();

  await page.goto('#/sjablonen');
  await expect(page.getByText('Mijn ad-hocsessie')).toBeVisible();
  await page.goto('#/historiek');
  await expect(page.locator('.list-item')).toHaveCount(1);
  await expect(page.getByText(/RPE 7/)).toBeVisible();
});

test('EMOM en circuit: groepstimer en rondes', async ({ page }) => {
  await importeer(page, voorbeeld('bibliotheek.json'));
  await page.goto('#/');
  await sluitMeldingen(page);
  await page.getByRole('button', { name: /Voorbeeld sessie A/ }).click();
  await expect(page.getByText('Circuit · 2 rondes')).toBeVisible();
  await page.getByRole('button', { name: /Start timer/ }).click();
  await expect(page.getByRole('button', { name: /Stop timer/ })).toBeVisible();
});

test('back-up maken, alles wissen en herstellen', async ({ page }) => {
  await accepteerDialogen(page);
  await importeer(page, voorbeeld('bibliotheek.json'));
  await importeer(page, voorbeeld('logs.json'));
  await importeer(page, voorbeeld('programma.json'));
  await page.goto('#/data');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Back-up downloaden' }).click()]);
  const pad = await download.path();
  const backup = JSON.parse(readFileSync(pad, 'utf8'));
  expect(backup).toMatchObject({ soort: 'backup', schemaVersie: 4 });
  expect(backup.programmas).toHaveLength(1);
  await expect(page.getByText(/Laatste back-up/)).toBeVisible();

  await page.getByRole('button', { name: 'Alles wissen' }).click();
  await expect(page.getByText('Alles is gewist.')).toBeVisible();
  await page.goto('#/oefeningen');
  await expect(page.getByText('Nog geen oefeningen.')).toBeVisible();

  await page.goto('#/data');
  await page.locator('label', { hasText: 'Kies back-upbestand' }).locator('input[type=file]').setInputFiles(pad);
  await expect(page.getByText('Back-up teruggezet.')).toBeVisible();
  await page.goto('#/oefeningen');
  await expect(page.getByText('Pull-up')).toBeVisible();
  await page.goto('#/historiek');
  await expect(page.locator('.list-item')).toHaveCount(2);
  await page.goto('#/programmas');
  await expect(page.getByText('Voorbeeldprogramma kracht')).toBeVisible();
});

test('import: v1-bestand, koppelen op een gelijkaardige naam, en foutmeldingen', async ({ page }) => {
  await importeer(page, voorbeeld('bibliotheek.json'));

  // Een oud v1-logbestand met "Pullup" (lijkt op Pull-up) en "SL RDL" (alias).
  const v1 = {
    schemaVersie: 1,
    soort: 'logs',
    oefeningen: [
      { id: 'a', naam: 'Pull ups' },
      { id: 'b', naam: 'SL RDL' },
    ],
    sessies: [
      {
        id: 'oud-1',
        start: '2026-08-01T18:00',
        oefeningen: [
          { oefeningId: 'a', volgorde: 0, sets: [{ reps: 6, rir: 2 }] },
          { oefeningId: 'b', volgorde: 1, sets: [{ gewichtKg: 24, repsLinks: 8, repsRechts: 8 }] },
        ],
      },
    ],
  };
  await page.goto('#/data');
  await page.getByRole('textbox').first().fill(JSON.stringify(v1));
  await page.getByRole('button', { name: 'Controleren' }).click();
  await expect(page.getByText('Is dit dezelfde oefening?')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Importeren', exact: true })).toBeDisabled();
  await page.getByText('Koppelen aan "Pull-up"').click();
  await expect(page.getByText(/Oefeningen: 0 nieuw, 2 gekoppeld/)).toBeVisible();
  await page.getByRole('button', { name: 'Importeren', exact: true }).click();
  await expect(page.getByText('Import klaar.')).toBeVisible();
  await page.goto('#/oefeningen');
  await expect(page.locator('.list-item')).toHaveCount(6);

  // Foutmelding in het Nederlands, met het pad.
  await page.goto('#/data');
  await page.getByRole('textbox').first().fill('{"schemaVersie": 3, "soort": "bibliotheek", "oefeningen": [{"id": "x", "naam": "X", "repbereik": 5}]}');
  await page.getByRole('button', { name: 'Controleren' }).click();
  await expect(page.getByRole('alert')).toContainText('onbekend veld "repbereik"');
});

test('offline: de app opent zonder netwerk', async ({ page, context }) => {
  await page.goto('#/');
  // Wachten tot de service worker actief is; na herladen beheert hij de pagina.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Vandaag' })).toBeVisible();
  await page.goto('#/data');
  await expect(page.getByText(/Versie:/)).toBeVisible();
  await context.setOffline(false);
});

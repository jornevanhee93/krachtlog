import { expect, test, type Page } from '@playwright/test';
import { controleerScherm, importeer, sluitMeldingen, voorbeeld } from './helpers';

// Verbeteringen 1 en 2: snelle knop in de training en databescherming. Alle data is verzonnen.

async function startSessieA(page: Page) {
  await importeer(page, voorbeeld('bibliotheek.json'));
  await importeer(page, voorbeeld('logs.json'));
  await page.goto('#/');
  await sluitMeldingen(page);
  await page.getByRole('button', { name: /Voorbeeld sessie A/ }).click();
  await expect(page).toHaveURL(/#\/training/);
}

const snelleKnop = (page: Page) => page.locator('.exercise-card.open .snel-knop');

/** De knop staat volledig in beeld (na het automatisch scrollen) en wordt niet bedekt door de rustbalk of de onderbalk. */
async function nietBedekt(page: Page) {
  await expect
    .poll(async () => {
      const knop = await snelleKnop(page).boundingBox();
      if (!knop) return 'geen knop';
      let onder = 812;
      for (const sel of ['.bottom-nav', '.rest-bar']) {
        const box = (await page.locator(sel).count()) ? await page.locator(sel).boundingBox() : null;
        if (box) onder = Math.min(onder, box.y);
      }
      return knop.y > 0 && knop.y + knop.height <= onder ? 'vrij' : `bedekt (${Math.round(knop.y + knop.height)} > ${Math.round(onder)})`;
    })
    .toBe('vrij');
}

test('1. superset doorlopen met alleen de snelle knop', async ({ page }, info) => {
  await startSessieA(page);
  const kaarten = page.getByTestId('exercise-card');
  const pullup = kaarten.filter({ hasText: 'Pull-up' });
  const rdl = kaarten.filter({ hasText: 'Single-leg RDL' });

  // Het invulblok staat standaard dicht; de knop toont de voorgevulde set met de doel-RIR.
  await expect(page.locator('.exercise-card.open .set-editor')).toHaveCount(0);
  await expect(snelleKnop(page)).toContainText('✓');
  await expect(snelleKnop(page)).toContainText('RIR 2');
  await expect(page.locator('.exercise-card.open').getByRole('group', { name: 'RIR' }).getByRole('button', { name: '2' })).toHaveAttribute('aria-pressed', 'true');
  await nietBedekt(page);
  await controleerScherm(page, 'snel-start', info.project.name);

  for (let ronde = 1; ronde <= 3; ronde++) {
    await expect(page.locator('.exercise-card.open')).toContainText('Pull-up');
    await snelleKnop(page).click();
    await expect(page.locator('.rest-bar')).toBeVisible();
    await expect(page.locator('.exercise-card.open')).toContainText('Single-leg RDL');
    await expect(snelleKnop(page)).toContainText('L');
    await nietBedekt(page);
    await snelleKnop(page).click();
  }
  await expect(pullup).toContainText('✓ 3/3');
  await expect(rdl).toContainText('✓ 3/3');
  // Na de superset gaat de volgende oefening (power) open: geen RIR, wel kwaliteit.
  await expect(page.locator('.exercise-card.open')).toContainText('Box jump');
  await expect(page.locator('.exercise-card.open').getByRole('group', { name: 'RIR' })).toHaveCount(0);
  await expect(page.locator('.exercise-card.open').getByRole('group', { name: 'Kwaliteit' })).toBeVisible();
  await expect(snelleKnop(page)).not.toContainText('RIR');
  await nietBedekt(page);
  // Enkele oefening: na de tik blijft de kaart open en verschijnt de rustbalk; die bedekt de knop niet.
  await snelleKnop(page).click();
  await expect(page.locator('.rest-bar')).toBeVisible();
  await expect(page.locator('.exercise-card.open')).toContainText('Box jump');
  await nietBedekt(page);
  await controleerScherm(page, 'snel-rust', info.project.name);
});

test('1. aangepaste RIR en kwaliteit worden bewaard; een gedane set kan je nog aanpassen', async ({ page }) => {
  page.on('dialog', (d) => void d.accept());
  await startSessieA(page);
  const open = page.locator('.exercise-card.open');
  await open.getByRole('group', { name: 'RIR' }).getByRole('button', { name: '4' }).click();
  await open.getByRole('group', { name: 'Kwaliteit' }).getByRole('button', { name: 'Gevecht' }).click();
  await expect(snelleKnop(page)).toContainText('RIR 4');
  await snelleKnop(page).click();

  // De gedane set is een compacte regel; een tik opent het invulblok met de bewaarde RIR.
  const pullup = page.getByTestId('exercise-card').filter({ hasText: 'Pull-up' });
  await page.getByRole('button', { name: 'Pull-up openklappen' }).click();
  const regel = pullup.locator('.set-list li.done .set-row').first();
  await expect(regel).toContainText('RIR 4 · Gevecht');
  await regel.click();
  await expect(pullup.getByRole('group', { name: 'RIR' }).getByRole('button', { name: '4' })).toHaveAttribute('aria-pressed', 'true');
  await pullup.getByRole('group', { name: 'RIR' }).getByRole('button', { name: '3' }).click();
  await pullup.getByRole('button', { name: '✓', exact: true }).click();
  await expect(pullup.locator('.set-list li.done .set-row').first()).toContainText('RIR 3');

  // "Aanpassen" klapt het volledige invulblok open voor de huidige set.
  await pullup.getByRole('button', { name: 'Aanpassen', exact: true }).click();
  await expect(pullup.locator('.set-editor')).toBeVisible();
  await expect(pullup.getByRole('group', { name: 'RIR' }).getByRole('button', { name: '2' })).toHaveAttribute('aria-pressed', 'true');
  await pullup.getByRole('button', { name: 'Inklappen' }).click();
  await expect(pullup.locator('.set-editor')).toHaveCount(0);

  await page.getByRole('button', { name: 'Overslaan' }).click();
  await page.getByRole('button', { name: 'Sessie afsluiten' }).click();
  await page.getByRole('button', { name: 'Sessie bewaren' }).click();
  await expect(page).toHaveURL(/#\/historiek\//);
  await expect(page.getByText(/RIR 3 · Gevecht/)).toBeVisible();
});

test('1. opwarmset met de snelle knop: zonder RIR en zonder rust', async ({ page }) => {
  await startSessieA(page);
  await page.locator('.exercise-card.open').getByRole('button', { name: '+ Opwarmset' }).click();
  const open = page.locator('.exercise-card.open');
  await expect(open.locator('.snel')).toContainText('Opwarmset');
  await expect(open.locator('.snel').getByRole('group', { name: 'RIR' })).toHaveCount(0);
  await expect(snelleKnop(page)).not.toContainText('RIR');
  await snelleKnop(page).click();
  await expect(page.locator('.rest-bar')).toHaveCount(0);
  await expect(open.locator('.snel')).toContainText('Ronde 1');
});

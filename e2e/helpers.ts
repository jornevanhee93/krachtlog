import { expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

export function voorbeeld(naam: string): string {
  return readFileSync(new URL(`../docs/voorbeelden/${naam}`, import.meta.url), 'utf8');
}

/** Importeert een bestand via het plakveld op het Data-scherm. */
export async function importeer(page: Page, json: string) {
  await page.goto('#/data');
  await page.getByRole('textbox').first().fill(json);
  await page.getByRole('button', { name: 'Controleren' }).click();
  await page.getByRole('button', { name: 'Importeren', exact: true }).click();
  await expect(page.getByText('Import klaar.')).toBeVisible();
}

/** Geen horizontaal scrollen: niets is breder dan het scherm. */
export async function geenHorizontaalScrollen(page: Page) {
  const { scroll, breedte } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    breedte: window.innerWidth,
  }));
  expect(scroll, 'pagina is breder dan het scherm').toBeLessThanOrEqual(breedte);
}

/** Alle zichtbare kleuren zijn grijswaarden (r = g = b): geen accentkleur. */
export async function alleenZwartWit(page: Page) {
  const kleuren = await page.evaluate(() => {
    const uit = new Set<string>();
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      const cs = getComputedStyle(el);
      for (const k of ['color', 'background-color', 'border-top-color', 'border-bottom-color', 'fill', 'stroke']) {
        uit.add(cs.getPropertyValue(k));
      }
    }
    return [...uit];
  });
  const fout = kleuren.filter((c) => {
    const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
    return m && !(m[1] === m[2] && m[2] === m[3]);
  });
  expect(fout, 'gekleurde stijlen gevonden').toEqual([]);
}

/** Sluit de melding "werkt nu ook offline" als die er staat, zodat ze de schermafdruk niet bedekt. */
export async function sluitMeldingen(page: Page) {
  const knop = page.locator('.toast').getByRole('button', { name: 'Sluiten' });
  if (await knop.isVisible()) await knop.click();
}

export async function controleerScherm(page: Page, naam: string, project: string) {
  await sluitMeldingen(page);
  await geenHorizontaalScrollen(page);
  await alleenZwartWit(page);
  await page.screenshot({ path: `e2e/screenshots/${project}-${naam}.png`, fullPage: false });
}

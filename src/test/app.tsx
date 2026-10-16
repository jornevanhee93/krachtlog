// Hulp voor integratietests: de volledige app in jsdom, met een nep-IndexedDB.
import 'fake-indexeddb/auto';
import { cleanup, render } from '@testing-library/react';
import { HashRouter } from 'react-router';
import { afterEach, beforeEach, vi } from 'vitest';
import App from '../App';
import { db } from '../db/db';
import { pasImportToe } from '../db/repo';
import { maakImportPlan, voerImportUit } from '../logic/importPlan';
import { parseBestand } from '../logic/parseFile';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, () => {}],
    offlineReady: [false, () => {}],
    updateServiceWorker: async () => {},
  }),
}));

export function voorbeeldTekst(naam: string): string {
  return readFileSync(resolve(process.cwd(), 'docs/voorbeelden', naam), 'utf8');
}

/** Importeert een voorbeeldbestand rechtstreeks in de database (zonder twijfelvragen). */
export async function importeerVoorbeeld(naam: string) {
  const res = parseBestand(voorbeeldTekst(naam));
  if (!res.ok || res.soort === 'backup') throw new Error(`kan ${naam} niet importeren`);
  const bestaand = {
    materiaal: await db.materiaal.toArray(),
    oefeningen: await db.oefeningen.toArray(),
    sjablonen: await db.sjablonen.toArray(),
    sessieIds: (await db.sessies.toCollection().primaryKeys()) as string[],
  };
  await pasImportToe(voerImportUit(maakImportPlan(res.bestand, bestaand), {}, bestaand));
}

export function renderApp(pad = '/') {
  window.location.hash = `#${pad}`;
  return render(
    <HashRouter>
      <App />
    </HashRouter>,
  );
}

export function zetTestOmgevingOp() {
  beforeEach(async () => {
    await db.open();
    await Promise.all(db.tables.map((t) => t.clear()));
    window.confirm = () => true;
    window.alert = () => {};
    Element.prototype.scrollIntoView = () => {};
  });
  afterEach(() => cleanup());
}

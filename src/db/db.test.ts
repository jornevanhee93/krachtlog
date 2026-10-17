import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { KrachtlogDb } from './db';
import { leesSnapshot } from './repo';

// Data-veiligheid: een toestel met een oudere databaseversie moet na de update alles behouden.
describe('database-upgrade', () => {
  it('van versie 1 naar de huidige: alle bestaande gegevens blijven staan', async () => {
    const naam = 'upgrade-test-v1';
    const oud = new Dexie(naam);
    oud.version(1).stores({
      materiaal: '&id, naam',
      oefeningen: '&id, naam, *patronen',
      sjablonen: '&id, naam',
      sessies: '&id, start, soort, sjabloonId',
      entries: '&id, sessieId, oefeningId, [oefeningId+start]',
      instellingen: '&key',
      actief: '&key',
    });
    await oud.open();
    await oud.table('oefeningen').put({ id: 'o1', naam: 'Pull-up', aliassen: [], patronen: ['pull'], spieren: { primair: [], secundair: [] }, materiaalIds: [], metingen: ['reps'], unilateraal: false, cues: [], valkuilen: [], videolinks: [], tags: [], gearchiveerd: false });
    await oud.table('sessies').put({ id: 's1', soort: 'kracht', start: '2026-09-01T18:00' });
    await oud.table('entries').put({ id: 's1#0', sessieId: 's1', oefeningId: 'o1', start: '2026-09-01T18:00', volgorde: 0, sets: [{ opwarm: false, reps: 8 }] });
    await oud.table('actief').put({ key: 'actief', value: { id: 'lopend', start: '2026-10-01T10:00', opwarming: [], groepen: [], focus: null } });
    oud.close();

    const nieuw = new KrachtlogDb(naam);
    await nieuw.open();
    expect(nieuw.verno).toBeGreaterThanOrEqual(2);
    const snap = await leesSnapshot(nieuw);
    expect(snap.oefeningen.map((o) => o.naam)).toEqual(['Pull-up']);
    expect(snap.sessies).toHaveLength(1);
    expect(snap.entries[0].sets[0].reps).toBe(8);
    expect(snap.programmas).toEqual([]);
    expect(snap.planning).toEqual([]);
    expect((await nieuw.actief.get('actief'))?.value.id).toBe('lopend');
    // De index voor historiek per oefening werkt nog.
    expect(await nieuw.entries.where('[oefeningId+start]').between(['o1', ''], ['o1', '￿']).count()).toBe(1);
    nieuw.close();
  });

  it('van versie 2 naar de huidige (schema v4: tijd en afstand per kant): bestaande gegevens blijven staan', async () => {
    const naam = 'upgrade-test-v2';
    const oud = new Dexie(naam);
    oud.version(1).stores({
      materiaal: '&id, naam',
      oefeningen: '&id, naam, *patronen',
      sjablonen: '&id, naam',
      sessies: '&id, start, soort, sjabloonId',
      entries: '&id, sessieId, oefeningId, [oefeningId+start]',
      instellingen: '&key',
      actief: '&key',
    });
    oud.version(2).stores({ programmas: '&id, naam', planning: '&id, programmaId, datum' });
    await oud.open();
    await oud.table('sessies').put({ id: 's1', soort: 'kracht', start: '2026-09-01T18:00' });
    await oud.table('entries').put({ id: 's1#0', sessieId: 's1', oefeningId: 'cp', start: '2026-09-01T18:00', volgorde: 0, sets: [{ opwarm: false, duurSec: 30 }] });
    await oud.table('programmas').put({ id: 'p1', naam: 'Programma', startDatum: '2026-10-26', blokken: [] });
    await oud.table('planning').put({ id: 'p1:1:0', programmaId: 'p1', datum: '2026-10-26', status: 'gedaan' });
    oud.close();

    const nieuw = new KrachtlogDb(naam);
    await nieuw.open();
    expect(nieuw.verno).toBeGreaterThanOrEqual(3);
    const snap = await leesSnapshot(nieuw);
    expect(snap.entries[0].sets[0].duurSec).toBe(30);
    expect(snap.programmas.map((p) => p.id)).toEqual(['p1']);
    expect(snap.planning.map((p) => p.status)).toEqual(['gedaan']);
    // Een set per kant kan bewaard en gelezen worden.
    await nieuw.entries.put({ ...snap.entries[0], id: 's1#1', sets: [{ opwarm: false, duurSecLinks: 30, duurSecRechts: 25 }] });
    expect((await nieuw.entries.get('s1#1'))?.sets[0].duurSecRechts).toBe(25);
    nieuw.close();
  });
});


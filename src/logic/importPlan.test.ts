import type { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { bibliotheekBestand, logsBestand, oefening } from '../schema';
import { maakImportPlan, twijfelgevallen, voerImportUit, type Bestaand } from './importPlan';

const oef = (o: z.input<typeof oefening>) => oefening.parse(o);

const bestaand: Bestaand = {
  materiaal: [{ id: 'm1', naam: 'Gewichtsvest', soort: 'vest' }],
  oefeningen: [
    oef({ id: 'o1', naam: 'Pull-up', cues: ['borst naar stang'] }),
    oef({ id: 'o2', naam: 'Bear hug squat' }),
  ],
  sjablonen: [{ id: 's1', naam: 'Sessie A', opwarming: [], groepen: [{ type: 'enkel', rondes: 1, items: [{ oefeningId: 'o1' }] }] }],
  sessieIds: ['ses-1'],
};

const bib = bibliotheekBestand.parse({
  schemaVersie: 1,
  soort: 'bibliotheek',
  materiaal: [
    { id: 'vest', naam: 'gewichtsvest', soort: 'vest' },
    { id: 'kb', naam: 'Kettlebell 16', soort: 'kettlebell' },
  ],
  oefeningen: [
    {
      id: 'pu',
      naam: 'Pullup',
      aliassen: ['Pull-up'],
      cues: ['iets anders'],
      patronen: ['pull-verticaal'],
      materiaalIds: ['vest'],
      progressie: { modus: 'ladder', treden: [{ label: 'BW' }, { label: 'Vest 5', last: { extraKg: 5, materiaalId: 'vest' } }] },
    },
    { id: 'bhs', naam: 'Bearhug squat' },
    { id: 'swing', naam: 'KB swing', materiaalIds: ['kb'] },
  ],
  sjablonen: [
    { id: 'a', naam: 'sessie a', groepen: [{ items: [{ oefeningId: 'pu' }, { oefeningId: 'bhs' }] }] },
    { id: 'b', naam: 'Sessie B', groepen: [{ items: [{ oefeningId: 'swing' }] }] },
  ],
});

describe('import van een bibliotheek', () => {
  const plan = maakImportPlan(bib, bestaand);

  it('herkent exacte matches en twijfelgevallen', () => {
    expect(plan.oefeningen.map((o) => o.match.type)).toEqual(['exact', 'twijfel', 'nieuw']);
    expect(twijfelgevallen(plan).map((o) => o.bron.id)).toEqual(['bhs']);
    expect(plan.materiaal.map((m) => m.bestaandId)).toEqual(['m1', undefined]);
    expect(plan.sjablonen.map((s) => s.vervangtId)).toEqual(['s1', undefined]);
  });

  it('koppelt bij keuze "koppelen" en vertaalt alle verwijzingen', () => {
    const res = voerImportUit(plan, { bhs: 'o2' }, bestaand);
    expect(res.samenvatting).toMatchObject({
      materiaalNieuw: 1,
      materiaalGekoppeld: 1,
      oefeningenNieuw: 1,
      oefeningenGekoppeld: 2,
      sjablonenNieuw: 1,
      sjablonenVervangen: 1,
    });
    const pu = res.oefeningen.find((o) => o.id === 'o1')!;
    // Eigen gegevens blijven, lege velden worden aangevuld, naam wordt alias
    expect(pu.cues).toEqual(['borst naar stang']);
    expect(pu.patronen).toEqual(['pull-verticaal']);
    expect(pu.aliassen).toEqual(['Pullup']);
    expect(pu.materiaalIds).toEqual(['m1']);
    expect(pu.progressie?.treden[1].last.materiaalId).toBe('m1');

    const sjabA = res.sjablonen.find((s) => s.id === 's1')!;
    expect(sjabA.groepen[0].items.map((i) => i.oefeningId)).toEqual(['o1', 'o2']);
    const swing = res.oefeningen.find((o) => o.naam === 'KB swing')!;
    expect(swing.id).toBe('swing');
    expect(swing.materiaalIds).toEqual(['kb']);
  });

  it('maakt een nieuwe oefening bij keuze "nieuw"', () => {
    const res = voerImportUit(plan, { bhs: 'nieuw' }, bestaand);
    expect(res.samenvatting.oefeningenNieuw).toBe(2);
    expect(res.sjablonen.find((s) => s.id === 's1')!.groepen[0].items[1].oefeningId).toBe('bhs');
  });

  it('geeft een nieuw id als het id al bezet is', () => {
    const botsing = bibliotheekBestand.parse({ schemaVersie: 1, soort: 'bibliotheek', oefeningen: [{ id: 'o1', naam: 'Farmer carry' }] });
    const res = voerImportUit(maakImportPlan(botsing, bestaand), {}, bestaand);
    expect(res.oefeningen[0].id).not.toBe('o1');
    expect(res.oefeningen[0].id).toMatch(/^oef-/);
  });
});

describe('import van logs', () => {
  it('koppelt de oefeningen en slaat dubbele sessies over', () => {
    const logs = logsBestand.parse({
      schemaVersie: 1,
      soort: 'logs',
      oefeningen: [{ id: 'x', naam: 'pull-up' }],
      sessies: [
        { id: 'ses-1', start: '2026-09-01', oefeningen: [{ oefeningId: 'x', volgorde: 0 }] },
        { id: 'ses-2', start: '2026-09-03', sjabloonId: 'onbekend', oefeningen: [{ oefeningId: 'x', volgorde: 0, sets: [{ reps: 5 }] }] },
      ],
    });
    const res = voerImportUit(maakImportPlan(logs, bestaand), {}, bestaand);
    expect(res.samenvatting).toMatchObject({ sessiesNieuw: 1, sessiesDubbel: 1, oefeningenNieuw: 0, oefeningenGekoppeld: 1 });
    expect(res.sessies[0].oefeningen[0].oefeningId).toBe('o1');
    expect(res.sessies[0].sjabloonId).toBeUndefined();
  });
});

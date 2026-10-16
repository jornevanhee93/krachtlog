import type { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { oefening, sjabloon } from '../schema';
import {
  STANDAARD_RUST_SEC,
  allesAfgewerkt,
  itemVoortgang,
  naarSessie,
  naarSjabloon,
  pasVoorstelToe,
  setKlaar,
  startSessie,
  verwijderOefening,
  voegOefeningToe,
  voegOpwarmsetToe,
  volgendeSet,
  wisselOpen,
  type ActiveSession,
} from './activeSession';
import type { Voorstel } from './progression';

const oef = (o: z.input<typeof oefening>) => oefening.parse(o);
const oefeningen = [
  oef({
    id: 'pu',
    naam: 'Pull-up',
    metingen: ['extraLast', 'reps'],
    progressie: {
      modus: 'ladder',
      repBereik: { min: 5, max: 8 },
      treden: [{ label: 'BW' }, { label: 'Vest 5', last: { extraKg: 5 } }],
      huidigeTrede: 'Vest 5',
    },
  }),
  oef({ id: 'rdl', naam: 'SL RDL', unilateraal: true }),
  oef({ id: 'swing', naam: 'KB swing' }),
];

const sjab = sjabloon.parse({
  id: 'A',
  naam: 'Sessie A',
  groepen: [
    {
      label: 'A',
      type: 'superset',
      rondes: 2,
      rustTussenOefeningenSec: 30,
      rustTussenRondesSec: 120,
      items: [{ oefeningId: 'pu' }, { oefeningId: 'rdl', repBereik: { min: 8, max: 12 } }],
    },
    { label: 'B', items: [{ oefeningId: 'swing', sets: 2, rustSec: 60, last: { gewichtKg: 16 } }] },
    { label: 'F', type: 'amrap', duurSec: 300, items: [{ oefeningId: 'swing' }, { oefeningId: 'pu' }] },
  ],
});

const T0 = 1_000_000;

describe('startSessie', () => {
  it('vult de sets in met de waarden van de vorige keer (zonder RIR of kwaliteit)', () => {
    const s = startSessie(sjab, oefeningen, {
      pu: [
        { opwarm: true, reps: 3 },
        { opwarm: false, extraKg: 5, trede: 'Vest 5', reps: 7, rir: 2, kwaliteit: 'controle' },
        { opwarm: false, extraKg: 5, trede: 'Vest 5', reps: 6, rir: 1 },
      ],
    });
    const pu = s.groepen[0].items[0];
    expect(pu.sets).toEqual([
      { opwarm: false, klaar: false, extraKg: 5, trede: 'Vest 5', reps: 7, ronde: 1 },
      { opwarm: false, klaar: false, extraKg: 5, trede: 'Vest 5', reps: 6, ronde: 2 },
    ]);
  });

  it('gebruikt anders het sjabloon, de ladder en de onderkant van het repbereik', () => {
    const s = startSessie(sjab, oefeningen, {});
    expect(s.groepen[0].items[0].sets[0]).toMatchObject({ trede: 'Vest 5', extraKg: 5, reps: 5 });
    expect(s.groepen[0].items[1].sets[0]).toMatchObject({ repsLinks: 8, repsRechts: 8, gewichtKg: 0 });
    expect(s.groepen[1].items[0].sets).toHaveLength(2);
    expect(s.groepen[1].items[0].sets[0]).toMatchObject({ gewichtKg: 16, reps: 0 });
    expect(s.groepen[2].items[0].sets).toHaveLength(1);
    expect(s.focus).toEqual({ groep: 0, item: 0 });
  });

  it('een lege sessie heeft geen groepen', () => {
    const s = startSessie(undefined, oefeningen, {});
    expect(s.groepen).toEqual([]);
    expect(s.focus).toBeNull();
  });
});

describe('setKlaar', () => {
  it('springt in een superset naar de volgende oefening, met rust tussen oefeningen en na een ronde', () => {
    let s = startSessie(sjab, oefeningen, {});
    s = setKlaar(s, { groep: 0, item: 0 }, 0, T0);
    expect(s.focus).toEqual({ groep: 0, item: 1 });
    expect(s.rust).toEqual({ eindigtOp: T0 + 30_000, duurSec: 30 });

    s = setKlaar(s, { groep: 0, item: 1 }, 0, T0);
    expect(s.focus).toEqual({ groep: 0, item: 0 });
    expect(s.rust?.duurSec).toBe(120);

    s = setKlaar(s, s.focus!, 1, T0);
    s = setKlaar(s, s.focus!, 1, T0);
    // Superset klaar → naar groep B
    expect(s.focus).toEqual({ groep: 1, item: 0 });
    expect(s.rust?.duurSec).toBe(120);
  });

  it('blijft bij een enkele oefening tot alle sets klaar zijn', () => {
    let s: ActiveSession = { ...startSessie(sjab, oefeningen, {}), focus: { groep: 1, item: 0 } };
    s = setKlaar(s, { groep: 1, item: 0 }, 0, T0);
    expect(s.focus).toEqual({ groep: 1, item: 0 });
    expect(s.rust?.duurSec).toBe(60);
    s = setKlaar(s, { groep: 1, item: 0 }, 1, T0);
    expect(s.focus).toEqual({ groep: 2, item: 0 });
  });

  it('start geen rust na een opwarmset', () => {
    let s = startSessie(sjab, oefeningen, {});
    s = voegOpwarmsetToe(s, { groep: 0, item: 0 });
    expect(s.groepen[0].items[0].sets[0].opwarm).toBe(true);
    expect(volgendeSet(s.groepen[0].items[0])).toBe(0);
    s = setKlaar(s, { groep: 0, item: 0 }, 0, T0);
    expect(s.rust).toBeUndefined();
  });

  it('voegt bij een AMRAP een nieuwe ronde toe als de ronde rond is, zonder rusttimer', () => {
    let s: ActiveSession = { ...startSessie(sjab, oefeningen, {}), focus: { groep: 2, item: 0 } };
    s = setKlaar(s, { groep: 2, item: 0 }, 0, T0);
    expect(s.rust).toBeUndefined();
    expect(s.focus).toEqual({ groep: 2, item: 1 });
    s = setKlaar(s, { groep: 2, item: 1 }, 0, T0);
    expect(s.groepen[2].items.map((i) => i.sets.map((x) => x.ronde))).toEqual([
      [1, 2],
      [1, 2],
    ]);
    expect(s.focus).toEqual({ groep: 2, item: 0 });
  });

  it('gebruikt de standaardrust als er niets is opgegeven', () => {
    let s = voegOefeningToe(startSessie(undefined, oefeningen, {}), oefeningen[2], undefined);
    s = setKlaar(s, { groep: 0, item: 0 }, 0, T0);
    expect(s.rust?.duurSec).toBe(STANDAARD_RUST_SEC);
  });
});

describe('afsluiten', () => {
  it('bewaart alleen afgewerkte sets en oefeningen met minstens één set', () => {
    let s = startSessie(sjab, oefeningen, {}, new Date('2026-10-29T18:00:00Z'));
    s = setKlaar(s, { groep: 0, item: 0 }, 0, T0);
    s = setKlaar(s, { groep: 1, item: 0 }, 0, T0);
    const sessie = naarSessie(s, { einde: '2026-10-29T19:00:00Z', duurMin: 60, rpe: 7, plezier: 4, notitie: ' top ' });
    expect(sessie).toMatchObject({ start: '2026-10-29T18:00:00.000Z', duurMin: 60, rpe: 7, plezier: 4, notitie: 'top', sjabloonId: 'A' });
    expect(sessie.oefeningen.map((o) => [o.oefeningId, o.groep, o.groepType, o.volgorde, o.sets.length])).toEqual([
      ['pu', 'A', 'superset', 0, 1],
      ['swing', 'B', 'enkel', 1, 1],
    ]);
    expect(sessie.oefeningen[0].sets[0]).not.toHaveProperty('klaar');
  });

  it('maakt een sjabloon van de sessie', () => {
    let s = startSessie(sjab, oefeningen, {});
    s = setKlaar(s, { groep: 1, item: 0 }, 0, T0);
    s = setKlaar(s, { groep: 1, item: 0 }, 1, T0);
    const nieuw = naarSjabloon(s, ' Mijn sessie ');
    expect(nieuw.naam).toBe('Mijn sessie');
    expect(nieuw.groepen).toHaveLength(1);
    expect(nieuw.groepen[0].items[0]).toMatchObject({ oefeningId: 'swing', sets: 2, rustSec: 60, repBereik: { min: 0, max: 0 } });
    expect(sjabloon.safeParse(nieuw).success).toBe(true);
  });

  it('verwijdert een oefening en een lege groep', () => {
    const s = verwijderOefening(startSessie(sjab, oefeningen, {}), { groep: 1, item: 0 });
    expect(s.groepen.map((g) => g.label)).toEqual(['A', 'F']);
  });
});

describe('accordeon', () => {
  it('opent een andere oefening en klapt de open oefening dicht bij een tweede tik', () => {
    const s = startSessie(sjab, oefeningen, {}, new Date(T0));
    expect(s.focus).toEqual({ groep: 0, item: 0 });
    const b = wisselOpen(s, { groep: 1, item: 0 });
    expect(b.focus).toEqual({ groep: 1, item: 0 });
    expect(wisselOpen(b, { groep: 1, item: 0 }).focus).toBeNull();
  });

  it('na de laatste set van een enkele oefening opent de volgende vanzelf', () => {
    let s = startSessie(sjab, oefeningen, {}, new Date(T0));
    s = { ...s, focus: { groep: 1, item: 0 } };
    s = setKlaar(s, { groep: 1, item: 0 }, 0, T0);
    expect(s.focus).toEqual({ groep: 1, item: 0 });
    s = setKlaar(s, { groep: 1, item: 0 }, 1, T0);
    expect(s.focus).toEqual({ groep: 2, item: 0 });
  });

  it('in een superset gaat het na elke set naar de volgende oefening van de ronde, daarna verder', () => {
    let s = startSessie(sjab, oefeningen, {}, new Date(T0));
    s = setKlaar(s, { groep: 0, item: 0 }, 0, T0);
    expect(s.focus).toEqual({ groep: 0, item: 1 });
    s = setKlaar(s, { groep: 0, item: 1 }, 0, T0);
    expect(s.focus).toEqual({ groep: 0, item: 0 });
    s = setKlaar(s, { groep: 0, item: 0 }, 1, T0);
    s = setKlaar(s, { groep: 0, item: 1 }, 1, T0);
    expect(s.focus).toEqual({ groep: 1, item: 0 });
  });

  it('itemVoortgang en allesAfgewerkt', () => {
    let s = startSessie(sjab, oefeningen, {}, new Date(T0));
    s = voegOpwarmsetToe(s, { groep: 1, item: 0 });
    s = setKlaar(s, { groep: 1, item: 0 }, 0, T0);
    s = setKlaar(s, { groep: 1, item: 0 }, 1, T0);
    const v = itemVoortgang(s.groepen[1].items[0]);
    expect(v).toMatchObject({ klaar: 1, totaal: 2, afgewerkt: false });
    expect(v.laatste?.gewichtKg).toBe(16);
    expect(v.laatste && 'klaar' in v.laatste).toBe(false);
    expect(allesAfgewerkt(s)).toBe(false);
  });
});

describe('voorstel overnemen bij de start', () => {
  const klim: Voorstel = { type: 'klim', trede: 'Vest 10', last: { extraKg: 10 }, doelReps: 5, uitleg: '', alternatieven: [] };

  it('klimmen: nieuwe trede en last, reps terug naar het doel', () => {
    const s = startSessie(sjab, oefeningen, { pu: [{ opwarm: false, trede: 'Vest 5', extraKg: 5, reps: 8 }] }, new Date(T0), { pu: klim });
    const sets = s.groepen[0].items[0].sets;
    expect(sets.every((x) => x.trede === 'Vest 10' && x.extraKg === 10 && x.reps === 5)).toBe(true);
  });

  it('herhalen: de waarden van de vorige keer blijven staan', () => {
    const herhaal: Voorstel = { ...klim, type: 'herhaal', trede: 'Vest 5', last: { extraKg: 5 } };
    const s = startSessie(sjab, oefeningen, { pu: [{ opwarm: false, trede: 'Vest 5', extraKg: 5, reps: 7 }] }, new Date(T0), { pu: herhaal });
    expect(s.groepen[0].items[0].sets[0]).toMatchObject({ trede: 'Vest 5', reps: 7 });
  });

  it('unilateraal: beide kanten krijgen het doel', () => {
    const v: Voorstel = { type: 'lichter', last: { gewichtKg: 20 }, doelReps: 8, uitleg: '', alternatieven: [] };
    const set = pasVoorstelToe({ opwarm: false, gewichtKg: 24, repsLinks: 10, repsRechts: 9 }, v, oefeningen[1]);
    expect(set).toMatchObject({ gewichtKg: 20, repsLinks: 8, repsRechts: 8 });
  });
});

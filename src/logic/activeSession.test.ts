import type { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { oefening, sjabloon } from '../schema';
import {
  STANDAARD_RUST_SEC,
  allesAfgewerkt,
  itemVoortgang,
  naarSessie,
  naarSjabloon,
  ontbrekendeMeting,
  pasVoorstelToe,
  setKlaar,
  snelKlaar,
  snelleRir,
  snelleSet,
  updateSet,
  startSessie,
  vervangOefening,
  verwijderOefening,
  voegOefeningToe,
  voegOpwarmsetToe,
  volgendeSet,
  wisselOpen,
  vrijeSjabloonNaam,
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

  it('maakt een sjabloon van de volledige sessie, ook van oefeningen zonder gedane sets', () => {
    let s = startSessie(sjab, oefeningen, {});
    s = setKlaar(s, { groep: 1, item: 0 }, 0, T0);
    s = setKlaar(s, { groep: 1, item: 0 }, 1, T0);
    const nieuw = naarSjabloon(s, ' Mijn sessie ');
    expect(nieuw.naam).toBe('Mijn sessie');
    expect(nieuw.groepen.map((g) => [g.label, g.type, g.items.map((i) => i.oefeningId)])).toEqual([
      ['A', 'superset', ['pu', 'rdl']],
      ['B', 'enkel', ['swing']],
      ['F', 'amrap', ['swing', 'pu']],
    ]);
    expect(nieuw.groepen[0]).toMatchObject({ rondes: 2, rustTussenOefeningenSec: 30, rustTussenRondesSec: 120 });
    expect(nieuw.groepen[0].items[1]).toMatchObject({ repBereik: { min: 8, max: 12 } });
    expect(nieuw.groepen[1].items[0]).toMatchObject({ oefeningId: 'swing', sets: 2, rustSec: 60, last: { gewichtKg: 16 } });
    expect(nieuw.groepen[2]).toMatchObject({ duurSec: 300 });
    expect(nieuw.opwarming).toEqual(s.opwarming);
    expect(sjabloon.safeParse(nieuw).success).toBe(true);
  });

  it('een vervangen oefening komt niet in het sjabloon; haar vervanger wel, met de structuur (sets, rust)', () => {
    let s = startSessie(sjab, oefeningen, {});
    s = setKlaar(s, { groep: 1, item: 0 }, 0, T0);
    s = vervangOefening(s, { groep: 1, item: 0 }, oefeningen[0], undefined);
    const nieuw = naarSjabloon(s, 'X');
    expect(nieuw.groepen[1].items).toHaveLength(1);
    expect(nieuw.groepen[1].items[0]).toMatchObject({ oefeningId: 'pu', sets: 2, rustSec: 60 });
  });

  it('stelt een vrije naam voor als de naam van het sjabloon al bestaat', () => {
    expect(vrijeSjabloonNaam('Sessie A', [])).toBe('Sessie A');
    expect(vrijeSjabloonNaam('Sessie A', ['sessie a'])).toBe('Sessie A (aangepast)');
    expect(vrijeSjabloonNaam('Sessie A', ['Sessie A', 'Sessie A (aangepast)'])).toBe('Sessie A (aangepast 2)');
  });

  it('vervangen houdt de gedane sets: de oude oefening blijft staan, de nieuwe krijgt de resterende sets', () => {
    let s = startSessie(sjab, oefeningen, {}, new Date(T0));
    s = setKlaar(s, { groep: 1, item: 0 }, 0, T0);
    const pu = oefeningen[0];
    const na = vervangOefening(s, { groep: 1, item: 0 }, pu, undefined);
    const items = na.groepen[1].items;
    expect(items.map((i) => i.oefeningId)).toEqual(['swing', 'pu']);
    expect(items[0].sets).toHaveLength(1);
    expect(items[0].sets[0].klaar).toBe(true);
    expect(items[0].vervangen).toBe(true);
    expect(items[1].sets).toHaveLength(1);
    expect(items[1].sets.every((x) => !x.klaar)).toBe(true);
    expect(na.focus).toEqual({ groep: 1, item: 1 });
    // De gedane set van de oude oefening komt in de gelogde sessie.
    const gelogd = naarSessie(na, { einde: '2026-10-29T19:00:00Z' });
    expect(gelogd.oefeningen.map((o) => [o.oefeningId, o.sets.length])).toEqual([['swing', 1]]);
  });

  it('vervangen in een superset: de nieuwe oefening neemt de resterende rondes over', () => {
    let s = startSessie(sjab, oefeningen, {}, new Date(T0));
    s = setKlaar(s, { groep: 0, item: 0 }, 0, T0);
    const na = vervangOefening(s, { groep: 0, item: 0 }, oefeningen[2], undefined);
    const items = na.groepen[0].items;
    expect(items.map((i) => i.oefeningId)).toEqual(['pu', 'swing', 'rdl']);
    expect(items[1].sets.map((x) => x.ronde)).toEqual([2]);
  });

  it('vervangen zonder gedane sets vervangt gewoon', () => {
    const s = startSessie(sjab, oefeningen, {}, new Date(T0));
    const na = vervangOefening(s, { groep: 1, item: 0 }, oefeningen[0], undefined);
    expect(na.groepen[1].items.map((i) => i.oefeningId)).toEqual(['pu']);
    expect(na.groepen[1].items[0].sets).toHaveLength(2);
  });

  describe('de vervanger krijgt zijn eigen voorschrift', () => {
    const boxJump = oef({ id: 'bj', naam: 'Box jump', metingen: ['extraLast', 'reps'], progressie: { modus: 'ladder', profiel: 'power', treden: [{ label: '24 inch' }] } });
    const chinUp = oef({
      id: 'chin',
      naam: 'Chin-up',
      metingen: ['extraLast', 'reps'],
      progressie: {
        modus: 'ladder',
        repBereik: { min: 6, max: 8 },
        doelRIR: 2,
        treden: [{ label: 'BW' }, { label: 'Vest 5', last: { extraKg: 5 } }, { label: 'Vest 10', last: { extraKg: 10 } }],
        huidigeTrede: 'BW',
      },
    });
    const kb = oef({ id: 'kb', naam: 'KB swing' });
    const alle = [boxJump, chinUp, kb];
    const power = sjabloon.parse({
      id: 'P',
      naam: 'Power',
      groepen: [
        {
          label: 'A',
          type: 'superset',
          rondes: 3,
          rustTussenRondesSec: 90,
          items: [
            { oefeningId: 'bj', repBereik: { min: 3, max: 3 }, rustSec: 45, last: { variant: '24 inch', extraKg: 10 } },
            { oefeningId: 'kb' },
          ],
        },
      ],
    });

    it('na een gedane set: last, trede en reps van de nieuwe oefening, niet van de oude', () => {
      let s = startSessie(power, alle, {}, new Date(T0));
      s = setKlaar(s, { groep: 0, item: 0 }, 0, T0);
      const na = vervangOefening(s, { groep: 0, item: 0 }, chinUp, undefined);
      const nieuw = na.groepen[0].items[1];
      expect(nieuw.oefeningId).toBe('chin');
      expect(nieuw.sets).toEqual([
        { opwarm: false, klaar: false, trede: 'BW', reps: 6, ronde: 2 },
        { opwarm: false, klaar: false, trede: 'BW', reps: 6, ronde: 3 },
      ]);
      // Structuur blijft (rust), het voorschrift niet.
      expect(nieuw.doel).toEqual({ rustSec: 45 });
      expect(snelleRir(nieuw.sets[0], nieuw.doel, chinUp)).toBe(2);
    });

    it('zonder gedane sets: ook geen last of reps van de oude oefening', () => {
      const s = startSessie(power, alle, {}, new Date(T0));
      const na = vervangOefening(s, { groep: 0, item: 0 }, chinUp, undefined);
      const item = na.groepen[0].items[0];
      expect(item.doel).toEqual({ rustSec: 45 });
      expect(item.sets.map((x) => [x.extraKg, x.variant, x.reps, x.ronde])).toEqual([
        [undefined, undefined, 6, 1],
        [undefined, undefined, 6, 2],
        [undefined, undefined, 6, 3],
      ]);
    });

    it('met een vorige keer en een voorstel: die van de nieuwe oefening', () => {
      let s = startSessie(power, alle, {}, new Date(T0));
      s = setKlaar(s, { groep: 0, item: 0 }, 0, T0);
      const voorstel: Voorstel = { type: 'klim', trede: 'Vest 10', last: { extraKg: 10 }, doelReps: 6, uitleg: '', alternatieven: [] };
      const vorige = [{ opwarm: false, trede: 'Vest 5', extraKg: 5, reps: 8, rir: 2 }];
      const na = vervangOefening(s, { groep: 0, item: 0 }, chinUp, vorige, voorstel);
      expect(na.groepen[0].items[1].sets[0]).toMatchObject({ trede: 'Vest 10', extraKg: 10, reps: 6 });
    });

    it('bewaar als sjabloon: de vervanger krijgt geen last of reps van de vervangen oefening', () => {
      let s = startSessie(power, alle, {}, new Date(T0));
      s = setKlaar(s, { groep: 0, item: 0 }, 0, T0);
      s = vervangOefening(s, { groep: 0, item: 0 }, chinUp, undefined);
      const item = naarSjabloon(s, 'X').groepen[0].items[0];
      expect(item).toEqual({ oefeningId: 'chin', rustSec: 45 });
    });
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

describe('voorstel invullen: duur en afstand', () => {
  const plank = oefening.parse({
    id: 'cp',
    naam: 'Copenhagen plank',
    metingen: ['tijd'],
    progressie: {
      modus: 'ladder',
      profiel: 'isometrisch',
      duurBereikSec: { min: 30, max: 45 },
      treden: [{ label: 'Kort' }, { label: 'Lang' }],
    },
  });
  it('de voorgevulde duur is dezelfde als in het voorstel (de onderkant na een klim)', () => {
    const v: Voorstel = { type: 'klim', trede: 'Lang', last: {}, duurSec: 30, uitleg: 'klim naar Lang, terug naar 30 s', alternatieven: [] };
    expect(pasVoorstelToe({ opwarm: false, trede: 'Kort', duurSec: 45 }, v, plank)).toMatchObject({ trede: 'Lang', duurSec: 30 });
  });
  it('carry: de afstand van het voorstel', () => {
    const fc = oefening.parse({ id: 'fc', naam: 'Farmer carry', metingen: ['gewicht', 'afstand'] });
    const v: Voorstel = { type: 'klim', last: { gewichtKg: 28 }, afstandM: 20, uitleg: '', alternatieven: [] };
    expect(pasVoorstelToe({ opwarm: false, gewichtKg: 24, afstandM: 40 }, v, fc)).toMatchObject({ gewichtKg: 28, afstandM: 20 });
  });
});

describe('unilateraal met tijd: per kant', () => {
  const plank = oefening.parse({
    id: 'cp',
    naam: 'Copenhagen plank',
    metingen: ['tijd'],
    unilateraal: true,
    progressie: { modus: 'ladder', profiel: 'isometrisch', duurBereikSec: { min: 20, max: 30 }, treden: [{ label: 'Kort' }, { label: 'Lang' }] },
  });
  it('een nieuwe set krijgt links en rechts, op de onderkant van het duurbereik', () => {
    const s = voegOefeningToe(startSessie(undefined, [plank], {}), plank, undefined);
    expect(s.groepen[0].items[0].sets[0]).toMatchObject({ duurSecLinks: 20, duurSecRechts: 20 });
    expect(s.groepen[0].items[0].sets[0].duurSec).toBeUndefined();
  });
  it('het voorstel vult beide kanten in', () => {
    const v: Voorstel = { type: 'klim', trede: 'Lang', last: {}, duurSec: 20, uitleg: '', alternatieven: [] };
    expect(pasVoorstelToe({ opwarm: false, duurSecLinks: 30, duurSecRechts: 30 }, v, plank)).toMatchObject({ duurSecLinks: 20, duurSecRechts: 20 });
  });
  it('een oude set met één duur wordt voor beide kanten overgenomen', () => {
    const s = voegOefeningToe(startSessie(undefined, [plank], {}), plank, [{ opwarm: false, duurSec: 25 }]);
    expect(s.groepen[0].items[0].sets[0]).toMatchObject({ duurSecLinks: 25, duurSecRechts: 25 });
    expect(s.groepen[0].items[0].sets[0].duurSec).toBeUndefined();
  });
  it('de waarden van vorige keer worden per kant overgenomen', () => {
    const s = voegOefeningToe(startSessie(undefined, [plank], {}), plank, [{ opwarm: false, duurSecLinks: 25, duurSecRechts: 20, rir: 3 }]);
    expect(s.groepen[0].items[0].sets[0]).toMatchObject({ duurSecLinks: 25, duurSecRechts: 20 });
  });
});

describe('tijd en afstand zonder vorige keer', () => {
  const hold = (extra: Record<string, unknown> = {}, progressie: Record<string, unknown> = {}) =>
    oef({
      id: 'sh',
      naam: 'Suitcase hold',
      metingen: ['gewicht', 'tijd'],
      ...extra,
      progressie: {
        modus: 'ladder',
        profiel: 'isometrisch',
        duurBereikSec: { min: 30, max: 45 },
        treden: [{ label: '24 kg', last: { gewichtKg: 24 } }, { label: '32 kg', last: { gewichtKg: 32 }, duurBereikSec: { min: 20, max: 30 } }],
        huidigeTrede: '24 kg',
        ...progressie,
      },
    });
  const eerste = (s: ActiveSession) => s.groepen[s.groepen.length - 1].items[0].sets[0];

  it('toevoegen: start op de onderkant van het duurbereik van de progressie, niet op 0 s', () => {
    const o = hold();
    const s = voegOefeningToe(startSessie(undefined, [o], {}), o, undefined);
    expect(eerste(s)).toMatchObject({ gewichtKg: 24, duurSec: 30 });
  });

  it('het duurbereik van de trede gaat voor', () => {
    const o = hold({}, { huidigeTrede: '32 kg' });
    const s = voegOefeningToe(startSessie(undefined, [o], {}), o, undefined);
    expect(eerste(s)).toMatchObject({ gewichtKg: 32, duurSec: 20 });
  });

  it('een duur in de last (trede of sjabloon) gaat voor op het bereik', () => {
    const o = hold({}, { treden: [{ label: '24 kg', last: { gewichtKg: 24, duurSec: 40 } }] });
    expect(eerste(voegOefeningToe(startSessie(undefined, [o], {}), o, undefined)).duurSec).toBe(40);
    const sj = sjabloon.parse({ id: 'sj', naam: 'Test', groepen: [{ items: [{ oefeningId: 'sh', last: { duurSec: 35 } }] }] });
    expect(eerste(startSessie(sj, [o], {})).duurSec).toBe(35);
  });

  it('vanuit een sjabloon, ook unilateraal: links en rechts op de onderkant', () => {
    const o = hold({ unilateraal: true });
    const sj = sjabloon.parse({ id: 'sj', naam: 'Test', groepen: [{ items: [{ oefeningId: 'sh', sets: 2 }] }] });
    const s = startSessie(sj, [o], {});
    for (const set of s.groepen[0].items[0].sets) {
      expect(set).toMatchObject({ duurSecLinks: 30, duurSecRechts: 30 });
      expect(set.duurSec).toBeUndefined();
    }
  });

  it('zonder progressie of bereik: de duur blijft leeg (geen 0 s)', () => {
    const o = oef({ id: 'pl', naam: 'Plank', metingen: ['tijd'] });
    const set = eerste(voegOefeningToe(startSessie(undefined, [o], {}), o, undefined));
    expect(set.duurSec).toBeUndefined();
    expect(set.duurSecLinks).toBeUndefined();
    const uni = oef({ id: 'sp', naam: 'Side plank', metingen: ['tijd'], unilateraal: true, progressie: { modus: 'last' } });
    const s2 = eerste(voegOefeningToe(startSessie(undefined, [uni], {}), uni, undefined));
    expect(s2.duurSecLinks).toBeUndefined();
    expect(s2.duurSecRechts).toBeUndefined();
  });

  it('carry: de onderkant van het afstandsbereik, anders leeg', () => {
    const fc = oef({
      id: 'fc',
      naam: 'Farmer carry',
      metingen: ['gewicht', 'afstand'],
      progressie: { modus: 'last', profiel: 'carry', afstandBereikM: { min: 20, max: 40 } },
    });
    expect(eerste(voegOefeningToe(startSessie(undefined, [fc], {}), fc, undefined)).afstandM).toBe(20);
    const kaal = oef({ id: 'fc2', naam: 'Sled', metingen: ['afstand'] });
    expect(eerste(voegOefeningToe(startSessie(undefined, [kaal], {}), kaal, undefined)).afstandM).toBeUndefined();
  });

  it('vervangen tijdens de sessie: de vervanger start op zijn eigen onderkant', () => {
    const o = hold();
    const sj = sjabloon.parse({ id: 'sj', naam: 'Test', groepen: [{ items: [{ oefeningId: 'swing', sets: 3, repBereik: { min: 5, max: 5 } }] }] });
    let s = startSessie(sj, [...oefeningen, o], {});
    s = vervangOefening(s, { groep: 0, item: 0 }, o, undefined);
    expect(s.groepen[0].items[0].sets).toHaveLength(3);
    expect(s.groepen[0].items[0].sets[0]).toMatchObject({ gewichtKg: 24, duurSec: 30 });
  });

  it('de snelle knop logt geen set zonder duur of afstand', () => {
    const o = oef({ id: 'pl', naam: 'Plank', metingen: ['tijd'] });
    const s = voegOefeningToe(startSessie(undefined, [o], {}), o, undefined);
    const pos = { groep: 0, item: 0 };
    expect(ontbrekendeMeting(eerste(s), o)).toBe('tijd');
    expect(snelKlaar(s, pos, 0, o, T0)).toBe(s);
    const gevuld = updateSet(s, pos, 0, { duurSec: 40 });
    expect(ontbrekendeMeting(eerste(gevuld), o)).toBeUndefined();
    expect(snelKlaar(gevuld, pos, 0, o, T0).groepen[0].items[0].sets[0]).toMatchObject({ klaar: true, duurSec: 40 });
    const carry = oef({ id: 'sl', naam: 'Sled', metingen: ['afstand'], unilateraal: true });
    expect(ontbrekendeMeting({ opwarm: false }, carry)).toBe('afstand');
    expect(ontbrekendeMeting({ opwarm: false, afstandMLinks: 20 }, carry)).toBeUndefined();
  });
});

describe('trede invullen als de vorige sets er geen hadden', () => {
  const bj = oefening.parse({
    id: 'bj',
    naam: 'Box jump',
    metingen: ['variant', 'reps'],
    progressie: {
      modus: 'ladder',
      profiel: 'power',
      treden: [{ label: 'Box 40', last: { variant: '40 cm' } }, { label: 'Box 50', last: { variant: '50 cm' } }],
      huidigeTrede: 'Box 50',
    },
  });
  const vorige = [{ opwarm: false, reps: 3 }];

  it('neemt de trede van het voorstel (ook bij herhalen)', () => {
    const v: Voorstel = { type: 'herhaal', trede: 'Box 40', last: { variant: '40 cm' }, uitleg: '', alternatieven: [] };
    const s = voegOefeningToe(startSessie(undefined, [bj], {}), bj, vorige, v);
    expect(s.groepen[0].items[0].sets[0]).toMatchObject({ trede: 'Box 40', variant: '40 cm', reps: 3 });
  });

  it('zonder voorstel: de huidige trede van de oefening', () => {
    const s = voegOefeningToe(startSessie(undefined, [bj], {}), bj, vorige);
    expect(s.groepen[0].items[0].sets[0]).toMatchObject({ trede: 'Box 50' });
  });

  it('een gelogde trede blijft staan', () => {
    const v: Voorstel = { type: 'herhaal', trede: 'Box 40', uitleg: '', alternatieven: [] };
    const s = voegOefeningToe(startSessie(undefined, [bj], {}), bj, [{ opwarm: false, trede: 'Box 50', reps: 3 }], v);
    expect(s.groepen[0].items[0].sets[0].trede).toBe('Box 50');
  });
});

describe('snelle knop', () => {
  const squat = oef({ id: 'sq', naam: 'Squat', progressie: { modus: 'last', profiel: 'anker', doelRIR: 2 } });
  const boxJump = oef({ id: 'bj', naam: 'Box jump', metingen: ['variant', 'reps'], progressie: { modus: 'ladder', profiel: 'power', treden: [{ label: 'Box 50' }] } });

  it('stelt de doel-RIR voor: eerst het sjabloon, dan de oefening; de ingevulde RIR gaat voor', () => {
    const set = { opwarm: false, reps: 5 };
    expect(snelleRir(set, {}, squat)).toBe(2);
    expect(snelleRir(set, { doelRIR: 3 }, squat)).toBe(3);
    expect(snelleRir({ ...set, rir: 1 }, { doelRIR: 3 }, squat)).toBe(1);
    expect(snelleRir(set, {}, oefeningen[2])).toBeUndefined();
  });

  it('geen RIR bij power en opwarmsets', () => {
    expect(snelleRir({ opwarm: false, reps: 3 }, { doelRIR: 2 }, boxJump)).toBeUndefined();
    expect(snelleRir({ opwarm: true, reps: 3 }, { doelRIR: 2 }, squat)).toBeUndefined();
    expect(snelleSet({ opwarm: true, reps: 3 }, { doelRIR: 2 }, squat)).toEqual({ opwarm: true, reps: 3 });
  });

  it('laat een RIR per kant staan', () => {
    const set = { opwarm: false, rirLinks: 1, rirRechts: 2 };
    expect(snelleSet(set, { doelRIR: 2 }, squat)).toBe(set);
  });

  it('één tik vinkt de set af met de voorgestelde RIR, en springt in de superset door', () => {
    let s = startSessie(sjab, oefeningen, {});
    s = snelKlaar(s, { groep: 0, item: 0 }, 0, undefined, T0);
    expect(s.groepen[0].items[0].sets[0].klaar).toBe(true);
    expect(s.focus).toEqual({ groep: 0, item: 1 });
    expect(s.rust).toEqual({ eindigtOp: T0 + 30_000, duurSec: 30 });
  });

  it('bewaart een aangepaste RIR', () => {
    let s: ActiveSession = { ...startSessie(sjab, [...oefeningen, squat], {}), focus: { groep: 1, item: 0 } };
    s = snelKlaar(s, { groep: 1, item: 0 }, 0, squat, T0);
    expect(s.groepen[1].items[0].sets[0].rir).toBe(2);
    s = updateSet(s, { groep: 1, item: 0 }, 1, { rir: 4 });
    s = snelKlaar(s, { groep: 1, item: 0 }, 1, squat, T0);
    expect(s.groepen[1].items[0].sets[1]).toMatchObject({ klaar: true, rir: 4 });
    const gelogd = naarSessie(s, { einde: '2026-10-29T19:00:00Z', duurMin: 60 });
    expect(gelogd.oefeningen[0].sets.map((x) => x.rir)).toEqual([2, 4]);
  });

  it('doet niets met een set die al klaar is', () => {
    let s = startSessie(sjab, oefeningen, {});
    s = snelKlaar(s, { groep: 0, item: 0 }, 0, undefined, T0);
    expect(snelKlaar(s, { groep: 0, item: 0 }, 0, undefined, T0 + 5)).toBe(s);
  });
});

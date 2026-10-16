import type { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { filosofie as filosofieSchema, programma as programmaSchema } from '../schema';
import {
  alsSjabloon,
  botsingen48u,
  datumPlus,
  maandagVan,
  overslaan,
  overzicht,
  pasAan,
  planProgramma,
  statusNaAfsluiten,
  termijnen,
  weekdagNummer,
} from './planning';

// Verzonnen programma: blok 1 (2 weken, herhaal), blok 2 met een deloadweek.
const item = (oefeningId: string, rol?: 'anker' | 'rotatie') => ({ oefeningId, sets: 3, repBereik: { min: 5, max: 8 }, doelRIR: 2, rol });
const prog = (o: Partial<z.input<typeof programmaSchema>> = {}) =>
  programmaSchema.parse({
    id: 'p1',
    naam: 'Krachtblok',
    startDatum: '2026-10-26', // een maandag
    blokken: [
      {
        naam: 'Opbouw',
        weken: [
          {
            herhaal: 2,
            sessies: [
              { naam: 'Sessie A', weekdag: 'ma', tijd: '18:00', groepen: [{ items: [item('squat', 'anker'), item('row', 'rotatie')] }] },
              { naam: 'Sessie B', weekdag: 'do', tijd: '18:00', groepen: [{ items: [item('dl', 'anker')] }] },
            ],
          },
        ],
      },
      {
        naam: 'Intensief',
        weken: [
          { herhaal: 1, sessies: [{ naam: 'Sessie A', weekdag: 'ma', groepen: [{ items: [item('squat', 'anker'), item('press', 'rotatie')] }] }] },
          { label: 'Deload', sessies: [{ naam: 'Licht', weekdag: 'wo', groepen: [{ items: [item('squat', 'anker')] }] }] },
        ],
      },
    ],
    ...o,
  });

const filosofie = filosofieSchema.parse({});

describe('datums', () => {
  it('weekdag, maandag en dagen erbij', () => {
    expect(weekdagNummer('2026-10-26')).toBe(1);
    expect(weekdagNummer('2026-11-01')).toBe(7);
    expect(maandagVan('2026-10-29')).toBe('2026-10-26');
    expect(maandagVan('2026-11-01')).toBe('2026-10-26');
    expect(datumPlus('2026-10-30', 3)).toBe('2026-11-02');
    expect(datumPlus('2026-03-28', 2)).toBe('2026-03-30'); // zomertijd maakt niet uit
  });
});

describe('planProgramma', () => {
  it('zet elke sessie op haar weekdag, met herhaalde weken', () => {
    const g = planProgramma(prog());
    expect(g.map((x) => `${x.datum} ${x.sessie.naam} w${x.week}`)).toEqual([
      '2026-10-26 Sessie A w1',
      '2026-10-29 Sessie B w1',
      '2026-11-02 Sessie A w2',
      '2026-11-05 Sessie B w2',
      '2026-11-09 Sessie A w3',
      '2026-11-18 Licht w4',
    ]);
    expect(g[5].weekLabel).toBe('Deload');
    expect(g[4].blokNaam).toBe('Intensief');
    expect(g.every((x) => x.status === 'gepland')).toBe(true);
  });

  it('start midweeks: sessies vóór de startdatum vallen weg', () => {
    const g = planProgramma(prog({ startDatum: '2026-10-28' }));
    expect(g[0]).toMatchObject({ datum: '2026-10-29', sessie: { naam: 'Sessie B' }, week: 1 });
  });

  it('neemt status en aanpassing over', () => {
    const basis = planProgramma(prog());
    const aangepast = pasAan(basis[0], [{ type: 'enkel', rondes: 1, items: [item('goblet')] }]);
    const g = planProgramma(prog(), [aangepast, overslaan(basis[1])]);
    expect(g[0]).toMatchObject({ aangepast: true, status: 'gepland' });
    expect(g[0].sessie.groepen[0].items[0].oefeningId).toBe('goblet');
    expect(g[1].status).toBe('overgeslagen');
    // Statussen van een ander programma tellen niet.
    expect(planProgramma(prog({ id: 'p2' }), [overslaan(basis[1])])[1].status).toBe('gepland');
  });
});

describe('vandaag, gemist en volgende', () => {
  const g = planProgramma(prog());

  it('op de dag zelf', () => {
    const o = overzicht(g, '2026-10-29');
    expect(o.vandaag.map((x) => x.sessie.naam)).toEqual(['Sessie B']);
    expect(o.gemist.map((x) => x.datum)).toEqual(['2026-10-26']);
    expect(o.volgende?.datum).toBe('2026-11-02');
  });

  it('gedaan of overgeslagen is niet meer gemist', () => {
    const st = [statusNaAfsluiten(g[0], 's1', new Date(2026, 9, 26, 19)), overslaan(g[1])];
    const o = overzicht(planProgramma(prog(), st), '2026-10-31');
    expect(o.gemist).toEqual([]);
  });

  it('alleen de laatste 14 dagen vragen naar inhalen', () => {
    expect(overzicht(g, '2026-11-25').gemist.map((x) => x.datum)).toEqual(['2026-11-18']);
  });

  it('na het programma is er geen volgende', () => {
    expect(overzicht(g, '2026-12-01').volgende).toBeUndefined();
  });
});

describe('inhalen en overslaan', () => {
  const g = planProgramma(prog());

  it('op de dag zelf: gedaan', () => {
    expect(statusNaAfsluiten(g[0], 's1', new Date(2026, 9, 26, 19, 30))).toMatchObject({ status: 'gedaan', sessieId: 's1' });
  });

  it('later: ingehaald, en de rest van de planning blijft op zijn dag', () => {
    const st = statusNaAfsluiten(g[0], 's1', new Date(2026, 9, 27, 19, 30));
    expect(st.status).toBe('ingehaald');
    expect(st.op).toBeDefined();
    const na = planProgramma(prog(), [st]);
    expect(na.map((x) => x.datum)).toEqual(g.map((x) => x.datum));
    expect(na[1]).toMatchObject({ datum: '2026-10-29', status: 'gepland' });
  });

  it('overslaan', () => {
    expect(overslaan(g[0])).toEqual({ id: g[0].key, programmaId: 'p1', datum: '2026-10-26', status: 'overgeslagen' });
  });

  it('een geplande sessie als sjabloon om te starten', () => {
    expect(alsSjabloon(g[1])).toMatchObject({ naam: 'Sessie B', groepen: [{ items: [{ oefeningId: 'dl' }] }] });
  });
});

describe('48u-waarschuwing', () => {
  const g = planProgramma(prog());

  it('inhalen op dinsdag 18u botst met donderdag 18u (48u is niet minder dan 48u)', () => {
    expect(botsingen48u(new Date(2026, 9, 27, 18, 0), [], g, 48, g[0].key)).toEqual([]);
  });

  it('inhalen op dinsdag 19u: donderdag 18u is 47u later', () => {
    const b = botsingen48u(new Date(2026, 9, 27, 19, 0), [], g, 48, g[0].key);
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({ wat: 'gepland', naam: 'Sessie B', uren: 47 });
  });

  it('een gelogde krachtsessie kort ervoor', () => {
    const b = botsingen48u(new Date(2026, 9, 27, 18, 0), [{ start: new Date(2026, 9, 26, 18, 0).toISOString(), soort: 'kracht' }], [], 48);
    expect(b).toMatchObject([{ wat: 'gelogd', uren: 24 }]);
  });

  it('een loopsessie telt niet, en een sessie ver genoeg ervoor ook niet', () => {
    const b = botsingen48u(
      new Date(2026, 9, 30, 18, 0),
      [
        { start: new Date(2026, 9, 29, 18, 0).toISOString(), soort: 'loop' },
        { start: new Date(2026, 9, 27, 17, 0).toISOString(), soort: 'kracht' },
      ],
      [],
      48,
    );
    expect(b).toEqual([]);
  });

  it('de drempel komt uit de instellingen', () => {
    expect(botsingen48u(new Date(2026, 9, 27, 19, 0), [], g, 24, g[0].key)).toEqual([]);
  });
});

describe('termijnen van ankers en rotaties', () => {
  it('binnen de termijn: geen waarschuwing', () => {
    const t = termijnen(planProgramma(prog()), filosofie, '2026-10-26');
    const squat = t.find((x) => x.oefeningId === 'squat')!;
    expect(squat).toMatchObject({ rol: 'anker', wekenGepland: 4, wekenTotNu: 1, teLang: false });
    expect(t.find((x) => x.oefeningId === 'row')).toMatchObject({ rol: 'rotatie', wekenGepland: 2, teLang: false });
  });

  it('een rotatie die langer dan 6 weken loopt', () => {
    const lang = prog({
      blokken: [{ naam: 'Lang', weken: [{ herhaal: 8, sessies: [{ naam: 'A', weekdag: 'ma', groepen: [{ items: [item('row', 'rotatie')] }] }] }] }],
    });
    const t = termijnen(planProgramma(lang), filosofie, '2026-11-02');
    expect(t[0]).toMatchObject({ wekenGepland: 8, max: 6, teLang: true, nuTeLang: false, wekenTotNu: 2 });
    expect(termijnen(planProgramma(lang), filosofie, '2026-12-14')[0]).toMatchObject({ wekenTotNu: 8, nuTeLang: true });
  });

  it('een anker van 13 weken', () => {
    const lang = prog({
      blokken: [{ naam: 'Lang', weken: [{ herhaal: 13, sessies: [{ naam: 'A', weekdag: 'ma', groepen: [{ items: [item('squat', 'anker')] }] }] }] }],
    });
    expect(termijnen(planProgramma(lang), filosofie, '2026-10-26')[0]).toMatchObject({ wekenGepland: 13, max: 12, teLang: true });
  });

  it('oefeningen zonder rol tellen niet', () => {
    const p = prog({ blokken: [{ naam: 'X', weken: [{ sessies: [{ naam: 'A', weekdag: 'ma', groepen: [{ items: [item('x')] }] }] }] }] });
    expect(termijnen(planProgramma(p), filosofie, '2026-10-26')).toEqual([]);
  });
});

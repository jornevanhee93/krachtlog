import type { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { filosofie as filosofieSchema, materiaal as materiaalSchema, oefening, type LogSet } from '../schema';
import {
  evalueer,
  huidigeStand,
  isGestagneerd,
  maakVoorstel,
  regelsVoor,
  repsVan,
  rirVan,
  standVan,
  voorstelTekst,
  type Gedaan,
} from './progression';

// Alle data hieronder is verzonnen.
const oef = (o: z.input<typeof oefening>) => oefening.parse(o);
const filosofie = filosofieSchema.parse({});

const materiaal = [
  materiaalSchema.parse({ id: 'vest', naam: 'Vest', soort: 'vest', gewichten: { type: 'instelbaar', minKg: 0, maxKg: 20, stapKg: 2.5 } }),
  materiaalSchema.parse({
    id: 'stang',
    naam: 'Stang',
    soort: 'stang',
    gewichten: {
      type: 'schijven',
      stangKg: 20,
      schijven: [
        { kg: 20, aantal: 4 },
        { kg: 10, aantal: 2 },
        { kg: 5, aantal: 2 },
        { kg: 2.5, aantal: 2 },
        { kg: 1.25, aantal: 2 },
      ],
    },
  }),
  materiaalSchema.parse({ id: 'kb', naam: 'Kettlebells', soort: 'kettlebell', gewichten: { type: 'vast', kg: [16, 24, 28, 32] } }),
  materiaalSchema.parse({ id: 'box', naam: 'Box', soort: 'box' }),
];

const pullUp = oef({
  id: 'pu',
  naam: 'Pull-up',
  materiaalIds: ['vest'],
  metingen: ['extraLast', 'reps'],
  progressie: {
    modus: 'ladder',
    profiel: 'anker',
    repBereik: { min: 5, max: 8 },
    doelRIR: 2,
    sets: 3,
    treden: [
      { label: 'BW', last: { variant: 'BW' } },
      { label: 'Vest 5', last: { extraKg: 5 } },
      { label: 'Vest 10', last: { extraKg: 10 } },
      { label: 'Vest 10 + 3s excentrisch', last: { extraKg: 10, tempo: '3s excentrisch' }, repBereik: { min: 4, max: 6 } },
      { label: 'Vest 15', last: { extraKg: 15 } },
    ],
    huidigeTrede: 'Vest 5',
  },
});

const squat = oef({
  id: 'sq',
  naam: 'Back squat',
  materiaalIds: ['stang'],
  progressie: { modus: 'last', profiel: 'anker', repBereik: { min: 5, max: 8 }, doelRIR: 2, sets: 3 },
});

const squatLadder = oef({
  id: 'sql',
  naam: 'Squat (ladder)',
  materiaalIds: ['stang'],
  progressie: {
    modus: 'ladder',
    profiel: 'anker',
    repBereik: { min: 5, max: 8 },
    doelRIR: 2,
    sets: 3,
    treden: [
      { label: '80 kg', last: { gewichtKg: 80 } },
      { label: '90 kg', last: { gewichtKg: 90 } },
      { label: '100 kg', last: { gewichtKg: 100 } },
    ],
  },
});

const slRdl = oef({
  id: 'rdl',
  naam: 'Single-leg RDL',
  materiaalIds: ['kb'],
  unilateraal: true,
  progressie: { modus: 'last', profiel: 'opbouw', repBereik: { min: 8, max: 12 }, doelRIR: 2, sets: 3 },
});

const boxJump = oef({
  id: 'bj',
  naam: 'Box jump',
  materiaalIds: ['box'],
  metingen: ['variant', 'reps'],
  progressie: {
    modus: 'ladder',
    profiel: 'power',
    repBereik: { min: 3, max: 3 },
    sets: 3,
    treden: [{ label: 'Laag' }, { label: 'Middel' }, { label: 'Hoog' }],
  },
});

const carry = oef({
  id: 'fc',
  naam: 'Farmer carry',
  materiaalIds: ['kb'],
  metingen: ['gewicht', 'afstand'],
  progressie: { modus: 'last', profiel: 'carry', afstandBereikM: { min: 20, max: 40 }, sets: 3 },
});

const plank = oef({
  id: 'cp',
  naam: 'Copenhagen plank',
  metingen: ['tijd'],
  unilateraal: true,
  progressie: {
    modus: 'ladder',
    profiel: 'isometrisch',
    duurBereikSec: { min: 20, max: 30 },
    doelRIR: 3,
    sets: 2,
    treden: [{ label: 'Korte hefboom' }, { label: 'Lange hefboom' }],
  },
});

// Hulpjes om sessies te maken.
let dag = 1;
const keer = (sets: LogSet[]): Gedaan => ({ start: `2026-09-${String(dag++).padStart(2, '0')}T18:00`, sets });
const set = (s: Partial<LogSet>): LogSet => ({ opwarm: false, ...s });
const pu = (trede: string, extraKg: number, reps: number[], rir = 2, extra: Partial<LogSet> = {}) =>
  keer(reps.map((r) => set({ trede, extraKg, reps: r, rir, ...extra })));
const sq = (kg: number, reps: number[], rir = 2) => keer(reps.map((r) => set({ gewichtKg: kg, reps: r, rir })));
const rdl = (kg: number, links: number[], rechts: number[], rir = 2) =>
  keer(links.map((l, i) => set({ gewichtKg: kg, repsLinks: l, repsRechts: rechts[i], rirLinks: rir, rirRechts: rir })));

const voorstel = (o: typeof pullUp, historiek: Gedaan[]) => maakVoorstel({ oefening: o, materiaal, filosofie }, historiek);

describe('sets lezen', () => {
  it('de zwakke kant beslist over reps en RIR', () => {
    expect(repsVan(set({ repsLinks: 10, repsRechts: 8 }))).toBe(8);
    expect(repsVan(set({ repsLinks: 10 }))).toBe(10);
    expect(repsVan(set({}))).toBeUndefined();
    expect(rirVan(set({ rirLinks: 3, rirRechts: 1 }))).toBe(1);
    expect(rirVan(set({ rir: 2 }))).toBe(2);
  });

  it('stand: meest gebruikte trede, of de last in kg', () => {
    expect(standVan(pu('Vest 5', 5, [8, 8, 8]).sets, pullUp).trede?.label).toBe('Vest 5');
    // Geen tredelabel gelogd: de trede volgt uit de last.
    expect(standVan([set({ extraKg: 10, reps: 6 })], pullUp).trede?.label).toBe('Vest 10');
    expect(standVan(sq(90, [8, 8, 7]).sets, squat).kg).toBe(90);
    expect(standVan([set({ opwarm: true, gewichtKg: 60 }), set({ gewichtKg: 90 })], squat).kg).toBe(90);
  });

  it('huidige stand zonder historiek: de huidige trede uit de oefening', () => {
    expect(huidigeStand(pullUp, []).trede?.label).toBe('Vest 5');
    expect(huidigeStand(squatLadder, []).trede?.label).toBe('80 kg');
  });
});

describe('regels uit profiel en instellingen', () => {
  it('power: kwaliteit, 2 sessies op rij (standaard uit de instellingen)', () => {
    expect(regelsVoor(boxJump.progressie!, filosofie)).toMatchObject({ criterium: 'kwaliteit', sessiesOpRij: 2 });
  });
  it('anker: 3 sessies stilstand → 10% lichter', () => {
    expect(regelsVoor(squat.progressie!, filosofie).stagnatie).toEqual({ sessies: 3, actie: 'lichter', percentage: 10 });
  });
  it('niet-anker: wisselen bij stilstand', () => {
    expect(regelsVoor(slRdl.progressie!, filosofie).stagnatie.actie).toBe('wisselen');
  });
  it('aangepaste instellingen worden gevolgd, niet hard gecodeerd', () => {
    const f = filosofieSchema.parse({
      profielen: { power: { criterium: 'kwaliteit', sessiesOpRij: 3 }, anker: { criterium: 'rir', sessiesOpRij: 1, stagnatieSessies: 4, stagnatiePercentage: 5 } },
    });
    expect(regelsVoor(boxJump.progressie!, f).sessiesOpRij).toBe(3);
    expect(regelsVoor(squat.progressie!, f).stagnatie).toMatchObject({ sessies: 4, percentage: 5 });
  });
  it('een eigen klimregel in de oefening gaat voor het profiel', () => {
    const o = oef({ ...boxJump, progressie: { ...boxJump.progressie!, klim: { criterium: 'kwaliteit', sessiesOpRij: 1 } } });
    expect(regelsVoor(o.progressie!, filosofie).sessiesOpRij).toBe(1);
  });
});

describe('evaluatie', () => {
  const r = regelsVoor(pullUp.progressie!, filosofie);

  it('gehaald: bovenkant in alle sets, op de doel-RIR', () => {
    expect(evalueer(pu('Vest 5', 5, [8, 8, 8]).sets, pullUp, r).gehaald).toBe(true);
  });
  it('één set onder de bovenkant: niet gehaald', () => {
    expect(evalueer(pu('Vest 5', 5, [8, 8, 7]).sets, pullUp, r)).toMatchObject({ gehaald: false, redenen: ['repsOnder'], minReps: 7 });
  });
  it('een set met Gevecht telt niet', () => {
    const k = keer([set({ trede: 'Vest 5', reps: 8, rir: 2 }), set({ trede: 'Vest 5', reps: 8, rir: 2 }), set({ trede: 'Vest 5', reps: 8, rir: 2, kwaliteit: 'gevecht' })]);
    expect(evalueer(k.sets, pullUp, r).redenen).toContain('gevecht');
  });
  it('RIR onder de doel-RIR of RIR 0 telt niet', () => {
    expect(evalueer(pu('Vest 5', 5, [8, 8, 8], 1).sets, pullUp, r).redenen).toContain('rirTeLaag');
    expect(evalueer(pu('Vest 5', 5, [8, 8, 8], 0).sets, pullUp, r).gehaald).toBe(false);
  });
  it('opwarmsets tellen niet mee', () => {
    const k = pu('Vest 5', 5, [8, 8, 8]);
    k.sets.unshift(set({ opwarm: true, reps: 3, rir: 0, kwaliteit: 'gevecht' }));
    expect(evalueer(k.sets, pullUp, r).gehaald).toBe(true);
  });
  it('te weinig sets: niet gehaald', () => {
    expect(evalueer(pu('Vest 5', 5, [8, 8]).sets, pullUp, r).redenen).toContain('teWeinigSets');
  });
  it('trede met eigen repbereik (4–6)', () => {
    expect(evalueer(pu('Vest 10 + 3s excentrisch', 10, [6, 6, 6]).sets, pullUp, r).gehaald).toBe(true);
  });
  it('unilateraal: beide kanten moeten de bovenkant halen', () => {
    const rr = regelsVoor(slRdl.progressie!, filosofie);
    expect(evalueer(rdl(24, [12, 12, 12], [12, 12, 11]).sets, slRdl, rr).gehaald).toBe(false);
    expect(evalueer(rdl(24, [12, 12, 12], [12, 12, 12]).sets, slRdl, rr).gehaald).toBe(true);
  });
  it('zonder progressie of zonder werksets: niet gehaald', () => {
    expect(evalueer([], pullUp, r).redenen).toEqual(['geenSets']);
  });
});

describe('voorstel: pull-up-ladder (BW → vest 5 → vest 10 → vest 10 + 3s → vest 15)', () => {
  it('nog niet gelogd: start op de huidige trede, onderaan', () => {
    const v = voorstel(pullUp, []);
    expect(v).toMatchObject({ type: 'start', trede: 'Vest 5', doelReps: 5 });
  });
  it('BW bovenkant gehaald → Vest 5, terug naar 5 reps', () => {
    const v = voorstel(pullUp, [pu('BW', 0, [8, 8, 8])]);
    expect(v).toMatchObject({ type: 'klim', trede: 'Vest 5', last: { extraKg: 5 }, doelReps: 5 });
    expect(v.uitleg).toMatch(/klim naar Vest 5/);
    expect(voorstelTekst(v)).toBe('Vest 5 · +5 kg × 5 · RIR 2');
  });
  it('Vest 10 gehaald → de excentrische trede met haar eigen bereik (4–6)', () => {
    const v = voorstel(pullUp, [pu('Vest 10', 10, [8, 8, 8])]);
    expect(v).toMatchObject({ type: 'klim', trede: 'Vest 10 + 3s excentrisch', reps: { min: 4, max: 6 }, doelReps: 4 });
    expect(v.last?.tempo).toBe('3s excentrisch');
  });
  it('net niet: herhaal, mik op 1 rep meer in de zwakste set', () => {
    const v = voorstel(pullUp, [pu('Vest 5', 5, [8, 7, 6])]);
    expect(v).toMatchObject({ type: 'herhaal', trede: 'Vest 5', doelReps: 7 });
    expect(v.uitleg).toMatch(/mik op 7/);
  });
  it('hoogste trede gehaald: alternatieven (reps, set, tempo, pauze, variant)', () => {
    const v = voorstel(pullUp, [pu('Vest 15', 15, [8, 8, 8])]);
    expect(v.type).toBe('alternatief');
    expect(v.alternatieven.map((a) => a.stap)).toEqual(['reps', 'sets', 'tempo', 'pauze', 'variant']);
  });
  it('stilstand op een anker (3 keer, geen vooruitgang) → een trede terug', () => {
    const v = voorstel(pullUp, [pu('Vest 10', 10, [7, 6, 6]), pu('Vest 10', 10, [7, 6, 5]), pu('Vest 10', 10, [6, 6, 6])]);
    expect(v).toMatchObject({ type: 'lichter', trede: 'Vest 5' });
  });
  it('wel vooruitgang in die 3 keer: geen stilstand', () => {
    const v = voorstel(pullUp, [pu('Vest 10', 10, [6, 6, 6]), pu('Vest 10', 10, [7, 6, 6]), pu('Vest 10', 10, [7, 7, 6])]);
    expect(v.type).toBe('herhaal');
  });
  it('Gevecht in de laatste set: herhaal met uitleg', () => {
    const k = pu('Vest 5', 5, [8, 8, 8]);
    k.sets[2].kwaliteit = 'gevecht';
    const v = voorstel(pullUp, [k]);
    expect(v.type).toBe('herhaal');
    expect(v.uitleg).toMatch(/Te zwaar gevochten/);
  });
  it('de volgende sessie vertrekt van wat je écht deed, niet van de huidige trede in de oefening', () => {
    const v = voorstel(pullUp, [pu('Vest 10', 10, [6, 6, 6])]);
    expect(v.trede).toBe('Vest 10');
  });
});

describe('voorstel: squat', () => {
  it('ladder 80 → 90 → 100', () => {
    expect(voorstel(squatLadder, [sq(80, [8, 8, 8])])).toMatchObject({ type: 'klim', trede: '90 kg', last: { gewichtKg: 90 } });
    expect(voorstel(squatLadder, [sq(90, [8, 8, 8])])).toMatchObject({ type: 'klim', trede: '100 kg' });
    expect(voorstel(squatLadder, [sq(100, [8, 8, 8])]).type).toBe('alternatief');
  });
  it('modus last: de kleinste stap van de stang (+2,5 kg)', () => {
    const v = voorstel(squat, [sq(80, [8, 8, 8])]);
    expect(v).toMatchObject({ type: 'klim', last: { gewichtKg: 82.5 }, doelReps: 5 });
    expect(voorstelTekst(v)).toBe('82,5 kg × 5 · RIR 2');
  });
  it('modus last met een eigen kleinste stap van 5 kg', () => {
    const o = oef({ ...squat, progressie: { ...squat.progressie!, kleinsteStapKg: 5 } });
    expect(voorstel(o, [sq(80, [8, 8, 8])]).last).toEqual({ gewichtKg: 85 });
  });
  it('de zwaarste last van de stang gehaald: geen stap → alternatieven', () => {
    const max = 20 + 2 * (40 + 10 + 5 + 2.5 + 1.25);
    expect(voorstel(squat, [sq(max, [8, 8, 8])]).type).toBe('alternatief');
  });
  it('anker stokt 3 sessies → 10% lichter, afgerond op een haalbare last', () => {
    const v = voorstel(squat, [sq(100, [6, 6, 5]), sq(100, [6, 5, 5]), sq(100, [6, 6, 5])]);
    expect(v).toMatchObject({ type: 'lichter', last: { gewichtKg: 90 } });
    expect(v.uitleg).toMatch(/10% lichter/);
  });
  it('2 sessies stilstand is nog geen stagnatie', () => {
    expect(voorstel(squat, [sq(100, [6, 6, 5]), sq(100, [6, 5, 5])]).type).toBe('herhaal');
  });
  it('stilstand op een andere last telt niet mee', () => {
    expect(voorstel(squat, [sq(97.5, [6, 6, 6]), sq(100, [6, 6, 5]), sq(100, [6, 5, 5])]).type).toBe('herhaal');
  });
});

describe('voorstel: single-leg RDL 24 → 28 → 32 kg per kant (opbouw, unilateraal)', () => {
  it('beide kanten 12: naar 28 kg', () => {
    const v = voorstel(slRdl, [rdl(24, [12, 12, 12], [12, 12, 12])]);
    expect(v).toMatchObject({ type: 'klim', last: { gewichtKg: 28 }, doelReps: 8 });
    // +4 kg is meer dan 10%: eerst reps verzamelen mag (opbouw).
    expect(v.alternatieven[0].stap).toBe('reps');
  });
  it('de zwakke kant beslist: rechts 11 → herhaal 24 kg', () => {
    const v = voorstel(slRdl, [rdl(24, [12, 12, 12], [12, 11, 12])]);
    expect(v).toMatchObject({ type: 'herhaal', doelReps: 12 });
    expect(v.uitleg).toMatch(/zwakke kant/);
  });
  it('28 → 32, en op 32 (zwaarste kettlebell) alternatieven', () => {
    expect(voorstel(slRdl, [rdl(28, [12, 12, 12], [12, 12, 12])]).last).toEqual({ gewichtKg: 32 });
    expect(voorstel(slRdl, [rdl(32, [12, 12, 12], [12, 12, 12])]).type).toBe('alternatief');
  });
  it('niet-anker stokt 3 sessies → wisselen', () => {
    const v = voorstel(slRdl, [rdl(28, [9, 9, 8], [9, 9, 8]), rdl(28, [9, 8, 8], [9, 8, 8]), rdl(28, [9, 9, 8], [9, 9, 8])]);
    expect(v.type).toBe('wissel');
  });
});

describe('voorstel: profielen', () => {
  const bj = (trede: string, kw: LogSet['kwaliteit'][]) => keer(kw.map((k) => set({ trede, reps: 3, kwaliteit: k })));

  it('power: 1 keer strak is niet genoeg, 2 keer op rij wel', () => {
    expect(voorstel(boxJump, [bj('Laag', ['makkelijk', 'makkelijk', 'makkelijk'])])).toMatchObject({ type: 'herhaal' });
    expect(
      voorstel(boxJump, [bj('Laag', ['makkelijk', 'makkelijk', 'makkelijk']), bj('Laag', ['makkelijk', 'makkelijk', 'makkelijk'])]),
    ).toMatchObject({ type: 'klim', trede: 'Middel' });
  });
  it('power: de reeks breekt bij een set die niet makkelijk was', () => {
    const v = voorstel(boxJump, [
      bj('Laag', ['makkelijk', 'makkelijk', 'makkelijk']),
      bj('Laag', ['makkelijk', 'controle', 'makkelijk']),
      bj('Laag', ['makkelijk', 'makkelijk', 'makkelijk']),
    ]);
    expect(v.type).toBe('herhaal');
  });
  it('power gaat nooit op RIR', () => {
    const k = bj('Laag', ['makkelijk', 'makkelijk', 'makkelijk']);
    k.sets.forEach((s) => (s.rir = 0));
    const v = voorstel(boxJump, [k, bj('Laag', ['makkelijk', 'makkelijk', 'makkelijk'])]);
    expect(v.type).toBe('klim');
    expect(v.rir).toBeUndefined();
  });

  const fc = (kg: number, m: number[], kw?: LogSet['kwaliteit']) => keer(m.map((a) => set({ gewichtKg: kg, afstandM: a, kwaliteit: kw })));
  it('carry: houding eerst (Gevecht → herhaal)', () => {
    expect(voorstel(carry, [fc(24, [40, 40, 40], 'gevecht')]).uitleg).toMatch(/Te zwaar/);
  });
  it('carry: daarna afstand', () => {
    const v = voorstel(carry, [fc(24, [40, 30, 30], 'controle')]);
    expect(v.type).toBe('herhaal');
    expect(v.uitleg).toMatch(/afstand naar 40 m/);
  });
  it('carry: dan last', () => {
    expect(voorstel(carry, [fc(24, [40, 40, 40], 'controle')])).toMatchObject({ type: 'klim', last: { gewichtKg: 28 } });
  });

  const cp = (trede: string, sec: number[]) => keer(sec.map((d) => set({ trede, duurSec: d, rirLinks: 3, rirRechts: 3 })));
  it('isometrisch: eerst duur, dan hefboom', () => {
    expect(voorstel(plank, [cp('Korte hefboom', [30, 25])]).uitleg).toMatch(/langer vast/);
    expect(voorstel(plank, [cp('Korte hefboom', [30, 30])])).toMatchObject({ type: 'klim', trede: 'Lange hefboom' });
  });
  it('isometrisch: nooit tot falen (RIR 0 telt niet)', () => {
    const k = cp('Korte hefboom', [30, 30]);
    k.sets[0].rirLinks = 0;
    expect(voorstel(plank, [k]).type).toBe('herhaal');
  });
});

describe('grensgevallen', () => {
  it('geen progressie ingesteld', () => {
    expect(voorstel(oef({ id: 'x', naam: 'X' }), [sq(10, [10])]).type).toBe('geen');
  });
  it('alleen opwarmsets gelogd telt als nog niet gelogd', () => {
    expect(voorstel(squat, [keer([set({ opwarm: true, gewichtKg: 40, reps: 5 })])]).type).toBe('start');
  });
  it('een onbekend tredelabel valt terug op de huidige trede', () => {
    expect(voorstel(pullUp, [pu('Iets anders', 99, [5, 5, 5])]).trede).toBe('Vest 5');
  });
  it('stagnatie heeft minstens 2 sessies nodig', () => {
    expect(isGestagneerd([], 1)).toBe(false);
  });
  it('modus last zonder materiaal en zonder kleinste stap: alternatieven', () => {
    const o = oef({ id: 'y', naam: 'Y', progressie: { modus: 'last', repBereik: { min: 5, max: 5 } } });
    expect(voorstel(o, [sq(50, [5, 5, 5])]).type).toBe('alternatief');
  });
});

describe('sets zonder trede (bv. geïmporteerd)', () => {
  const tibialis = oef({
    id: 'tib',
    naam: 'Tibialis raise',
    metingen: ['variant', 'reps'],
    progressie: {
      modus: 'ladder',
      profiel: 'opbouw',
      doelRIR: 2,
      sets: 2,
      treden: [
        { label: 'BW 15', last: { variant: 'BW' }, repBereik: { min: 15, max: 15 } },
        { label: 'BW 20', last: { variant: 'BW' }, repBereik: { min: 20, max: 20 } },
        { label: 'BW 25', last: { variant: 'BW' }, repBereik: { min: 25, max: 25 } },
      ],
      huidigeTrede: 'BW 20',
    },
  });

  it('dezelfde last op meerdere treden: de huidige trede beslist, niet de onderste', () => {
    const k = keer([set({ reps: 20, rir: 2 }), set({ reps: 20, rir: 2 })]);
    expect(standVan(k.sets, tibialis).trede?.label).toBe('BW 20');
    const v = voorstel(tibialis, [k]);
    expect(v).toMatchObject({ type: 'klim', trede: 'BW 25' });
    expect(v.uitleg).toMatch(/klim naar BW 25/);
  });

  it('ook met de variant ingevuld', () => {
    const k = keer([set({ variant: 'BW', reps: 20, rir: 2 }), set({ variant: 'BW', reps: 20, rir: 2 })]);
    expect(voorstel(tibialis, [k])).toMatchObject({ type: 'klim', trede: 'BW 25' });
  });

  it('een last die bij precies één trede past, gaat naar die trede', () => {
    const k = keer([set({ extraKg: 10, reps: 8, rir: 2 }), set({ extraKg: 10, reps: 8, rir: 2 }), set({ extraKg: 10, reps: 8, rir: 2 })]);
    expect(standVan(k.sets, pullUp).trede?.label).toBe('Vest 10');
  });

  it('past de last bij geen enkele trede, dan de huidige trede', () => {
    const k = keer([set({ extraKg: 7.5, reps: 8, rir: 2 })]);
    expect(standVan(k.sets, pullUp).trede?.label).toBe('Vest 5');
  });

  it('zonder huidige trede en zonder passende last: de onderste trede', () => {
    const zonder = oef({ ...tibialis, progressie: { ...tibialis.progressie!, huidigeTrede: undefined } });
    const k = keer([set({ reps: 15, rir: 2 })]);
    expect(standVan(k.sets, zonder).trede?.label).toBe('BW 15');
  });
});

describe('alternatieven volgen het profiel', () => {
  const stappen = (v: { alternatieven: { stap: string }[] }) => v.alternatieven.map((a) => a.stap);

  it('power: nooit meer reps of trager tempo; wel complexiteit/variant, zwaarder, pauze', () => {
    const bj = (kw: LogSet['kwaliteit']) => keer([1, 2, 3].map(() => set({ trede: 'Hoog', reps: 3, kwaliteit: kw })));
    const v = voorstel(boxJump, [bj('makkelijk'), bj('makkelijk')]);
    expect(v.type).toBe('alternatief');
    expect(stappen(v)).not.toContain('reps');
    expect(stappen(v)).not.toContain('tempo');
    expect(stappen(v)).not.toContain('sets');
    expect(stappen(v)).toEqual(expect.arrayContaining(['complexiteit', 'variant', 'last', 'pauze']));
  });

  it('carry: houding, afstand en last (zonder zwaardere kettlebell: geen last)', () => {
    const v = voorstel(carry, [keer([40, 40, 40].map((a) => set({ gewichtKg: 32, afstandM: a, kwaliteit: 'controle' })))]);
    expect(v.type).toBe('alternatief');
    expect(stappen(v)).toEqual(['houding', 'afstand']);
  });

  it('isometrisch: duur, hefboom en last', () => {
    const v = voorstel(plank, [keer([30, 30].map((d) => set({ trede: 'Lange hefboom', duurSec: d, rirLinks: 3, rirRechts: 3 })))]);
    expect(v.type).toBe('alternatief');
    expect(stappen(v)).toEqual(['duur', 'hefboom', 'last']);
  });

  it('"meer reps boven het bereik" alleen als de bovenkant gehaald werd, niet bij stilstand onderaan', () => {
    const o = oef({
      id: 'gob',
      naam: 'Goblet squat',
      materiaalIds: ['kb'],
      progressie: { modus: 'last', profiel: 'opbouw', repBereik: { min: 6, max: 8 }, doelRIR: 2, sets: 3, stagnatie: { sessies: 3, actie: 'alternatief' } },
    });
    const vast = () => keer([6, 6, 6].map((r) => set({ gewichtKg: 24, reps: r, rir: 2 })));
    const v = voorstel(o, [vast(), vast(), vast()]);
    expect(v.type).toBe('alternatief');
    expect(stappen(v)).not.toContain('reps');
    expect(v.alternatieven.map((a) => a.tekst).join(' ')).not.toMatch(/boven het bereik/);
  });
});

describe('stilstand op de laagste trede van een anker', () => {
  const kbLadder = oef({
    id: 'kbs',
    naam: 'Goblet squat (ladder)',
    materiaalIds: ['kb'],
    progressie: {
      modus: 'ladder',
      profiel: 'anker',
      repBereik: { min: 6, max: 8 },
      doelRIR: 2,
      sets: 3,
      treden: [
        { label: 'KB 24', last: { gewichtKg: 24 } },
        { label: 'KB 28', last: { gewichtKg: 28 } },
      ],
    },
  });
  const vast = (trede: string, kg: number) => keer([6, 6, 6].map((r) => set({ trede, gewichtKg: kg, reps: r, rir: 2 })));

  it('het materiaal heeft een lichtere last: ~10% lichter (kleinste haalbare stap)', () => {
    const v = voorstel(kbLadder, [vast('KB 24', 24), vast('KB 24', 24), vast('KB 24', 24)]);
    expect(v).toMatchObject({ type: 'lichter', trede: 'KB 24', last: { gewichtKg: 16 } });
    expect(v.uitleg).toMatch(/lichter/);
  });

  it('vest op de laagste trede: een stap van het vest lichter', () => {
    const o = oef({
      ...pullUp,
      progressie: { ...pullUp.progressie!, treden: [{ label: 'Vest 5', last: { extraKg: 5 } }, { label: 'Vest 10', last: { extraKg: 10 } }], huidigeTrede: 'Vest 5' },
    });
    const v = voorstel(o, [pu('Vest 5', 5, [6, 6, 5]), pu('Vest 5', 5, [6, 5, 5]), pu('Vest 5', 5, [6, 6, 5])]);
    expect(v).toMatchObject({ type: 'lichter', last: { extraKg: 2.5 } });
  });

  it('geen lichtere last mogelijk (lichaamsgewicht): een alternatief', () => {
    const v = voorstel(pullUp, [pu('BW', 0, [6, 6, 5]), pu('BW', 0, [6, 5, 5]), pu('BW', 0, [6, 6, 5])]);
    expect(v.type).toBe('alternatief');
  });
});

describe('na een klim: terug naar de onderkant van duur en afstand', () => {
  it('isometrisch: klim naar de volgende hefboom, terug naar de onderkant van het duurbereik', () => {
    const k = keer([30, 30].map((d) => set({ trede: 'Korte hefboom', duurSec: d, rirLinks: 3, rirRechts: 3 })));
    const v = voorstel(plank, [k]);
    expect(v).toMatchObject({ type: 'klim', trede: 'Lange hefboom', duurSec: 20 });
    expect(v.uitleg).toMatch(/terug naar 20 s/);
    expect(voorstelTekst(v)).toMatch(/20 s/);
    expect(voorstelTekst(v)).not.toMatch(/30 s/);
  });

  it('carry: zwaarder, terug naar de onderkant van het afstandsbereik', () => {
    const v = voorstel(carry, [keer([40, 40, 40].map((a) => set({ gewichtKg: 24, afstandM: a, kwaliteit: 'controle' })))]);
    expect(v).toMatchObject({ type: 'klim', last: { gewichtKg: 28 }, afstandM: 20 });
    expect(v.uitleg).toMatch(/terug naar 20 m/);
  });

  it('herhalen houdt de bovenkant als doel', () => {
    const v = voorstel(plank, [keer([30, 25].map((d) => set({ trede: 'Korte hefboom', duurSec: d, rirLinks: 3, rirRechts: 3 })))]);
    expect(v).toMatchObject({ type: 'herhaal', duurSec: 30 });
  });
});

describe('unilateraal met tijd of afstand: de zwakke kant beslist', () => {
  const zij = (l: number, r: number) => set({ trede: 'Korte hefboom', duurSecLinks: l, duurSecRechts: r, rirLinks: 3, rirRechts: 3 });
  it('één kant onder de bovenkant: herhaal', () => {
    expect(voorstel(plank, [keer([zij(30, 30), zij(30, 25)])]).type).toBe('herhaal');
  });
  it('beide kanten aan de bovenkant: klim', () => {
    expect(voorstel(plank, [keer([zij(30, 30), zij(30, 30)])])).toMatchObject({ type: 'klim', trede: 'Lange hefboom' });
  });
  it('carry per kant', () => {
    const uni = oef({ ...carry, unilateraal: true });
    const k = keer([1, 2, 3].map(() => set({ gewichtKg: 24, afstandMLinks: 40, afstandMRechts: 30, kwaliteit: 'controle' })));
    expect(voorstel(uni, [k]).type).toBe('herhaal');
  });
});


describe('voorstelTekst zonder dubbele last', () => {
  it('een tredelabel dat de last herhaalt, staat er maar één keer', () => {
    const v = voorstel(squatLadder, [sq(80, [8, 8, 8])]);
    expect(voorstelTekst(v)).toBe('90 kg × 5 · RIR 2');
  });
  it('een label met extra informatie blijft', () => {
    expect(voorstelTekst(voorstel(pullUp, [pu('BW', 0, [8, 8, 8])]))).toMatch(/^Vest 5 · \+5 kg × 5/);
  });
});

// Progressie: de laatste sessie(s) evalueren tegen de ladder of de regel, en een voorstel maken.
// Alles puur. De standaarden (profielen, stagnatie) komen uit de instellingen (filosofie).
import { STANDAARD_VOLGORDE, type Filosofie, type LastSpec, type LogSet, type Materiaal, type Oefening, type Progressie, type ProgressieStap, type Trede } from '../schema';
import { formatGetal } from './format';
import { lastenVoor, lichter, volgendeLast } from './loadCalc';

/** Eén keer dat de oefening gedaan werd (een entry uit de historiek). */
export interface Gedaan {
  start: string;
  sets: LogSet[];
}

export type Criterium = 'rir' | 'kwaliteit' | 'duur' | 'afstand';
type Bereik = { min: number; max: number };

export interface Regels {
  criterium: Criterium;
  sessiesOpRij: number;
  stagnatie: { sessies: number; actie: 'lichter' | 'alternatief' | 'wisselen'; percentage: number };
}

export type Reden =
  | 'geenSets'
  | 'teWeinigSets'
  | 'geenBereik'
  | 'repsOnder'
  | 'rirTeLaag'
  | 'gevecht'
  | 'kwaliteit'
  | 'duurOnder'
  | 'afstandOnder';

export interface Evaluatie {
  gehaald: boolean;
  redenen: Reden[];
  /** Maat voor vooruitgang op dezelfde trede/last: totaal reps (zwakke kant), duur, afstand of aantal strakke sets. */
  score: number;
  /** Laagste aantal reps (zwakke kant) over de werksets. */
  minReps?: number;
}

/** Waar je staat: de trede van de ladder, of de last in kg. */
export interface Stand {
  trede?: Trede;
  tredeIndex?: number;
  kg?: number;
}

export interface Alternatief {
  stap: ProgressieStap;
  tekst: string;
}

export interface Voorstel {
  type: 'geen' | 'start' | 'klim' | 'herhaal' | 'lichter' | 'wissel' | 'alternatief';
  trede?: string;
  last?: LastSpec;
  reps?: Bereik;
  /** Concreet doel voor de reps vandaag (bv. 1 meer dan de zwakste set). */
  doelReps?: number;
  duurSec?: number;
  afstandM?: number;
  sets?: number;
  rir?: number;
  /** Eén regel uitleg. */
  uitleg: string;
  alternatieven: Alternatief[];
}

export interface Context {
  oefening: Oefening;
  materiaal: Pick<Materiaal, 'id' | 'gewichten'>[];
  filosofie: Filosofie;
}

// ---------- Sets lezen ----------

export function werkSets(sets: LogSet[]): LogSet[] {
  return sets.filter((s) => !s.opwarm);
}

/** Reps van een set; per kant beslist de zwakke kant. */
export function repsVan(s: LogSet): number | undefined {
  if (s.reps !== undefined) return s.reps;
  const kanten = [s.repsLinks, s.repsRechts].filter((x): x is number => x !== undefined);
  return kanten.length ? Math.min(...kanten) : undefined;
}

/** RIR van een set; per kant telt de laagste. */
export function rirVan(s: LogSet): number | undefined {
  if (s.rir !== undefined) return s.rir;
  const kanten = [s.rirLinks, s.rirRechts].filter((x): x is number => x !== undefined);
  return kanten.length ? Math.min(...kanten) : undefined;
}

/** Welk lastveld de oefening gebruikt in modus "last": gewicht, anders extra last. */
export function lastVeld(oef: Pick<Oefening, 'metingen'>): 'gewichtKg' | 'extraKg' {
  return !oef.metingen.includes('gewicht') && oef.metingen.includes('extraLast') ? 'extraKg' : 'gewichtKg';
}

// ---------- Regels ----------

const STANDAARD_KLIM = { criterium: 'rir', sessiesOpRij: 1 } as const;

/**
 * De regels voor deze oefening. Een eigen "klim" in de oefening gaat voor; staat die op de standaard
 * (RIR, 1 sessie) en heeft de oefening een profiel, dan gelden de standaarden van dat profiel uit de instellingen.
 */
export function regelsVoor(p: Progressie, f: Filosofie): Regels {
  const prof = p.profiel ? f.profielen[p.profiel] : undefined;
  const eigen = p.klim.criterium !== STANDAARD_KLIM.criterium || p.klim.sessiesOpRij !== STANDAARD_KLIM.sessiesOpRij;
  const criterium = eigen ? p.klim.criterium : (prof?.criterium ?? p.klim.criterium);
  const sessiesOpRij = eigen ? p.klim.sessiesOpRij : (prof?.sessiesOpRij ?? p.klim.sessiesOpRij);
  const actie = p.profiel === 'anker' || !p.profiel ? 'lichter' : 'wisselen';
  return {
    criterium,
    sessiesOpRij,
    stagnatie: {
      sessies: p.stagnatie?.sessies ?? prof?.stagnatieSessies ?? f.stagnatie.sessies,
      actie: p.stagnatie?.actie ?? actie,
      percentage: p.stagnatie?.percentage ?? prof?.stagnatiePercentage ?? f.stagnatie.lichterPercentage,
    },
  };
}

// ---------- Stand ----------

function meestVoorkomend<T>(lijst: T[], beter: (a: T, b: T) => boolean): T | undefined {
  const tel = new Map<T, number>();
  for (const x of lijst) tel.set(x, (tel.get(x) ?? 0) + 1);
  let best: T | undefined;
  let n = 0;
  for (const [x, c] of tel) {
    if (c > n || (c === n && best !== undefined && beter(x, best))) {
      best = x;
      n = c;
    }
  }
  return best;
}

function zoekTrede(p: Progressie, label: string | undefined): number {
  if (!label) return -1;
  return p.treden.findIndex((t) => t.label.toLowerCase() === label.toLowerCase());
}

function lastPast(t: Trede, s: LogSet): boolean {
  return (
    (t.last.gewichtKg ?? 0) === (s.gewichtKg ?? 0) &&
    (t.last.extraKg ?? 0) === (s.extraKg ?? 0) &&
    (!t.last.variant || !s.variant || t.last.variant.toLowerCase() === s.variant.toLowerCase()) &&
    (!t.last.tempo || t.last.tempo === s.tempo)
  );
}

/**
 * De trede van een set. Met een gelogd tredelabel: die trede. Zonder label (bv. geïmporteerd):
 * de trede waarvan de last (gewicht, extra last, variant, tempo) overeenkomt. Passen er meerdere
 * (bv. BW 15 → BW 20 → BW 25, allemaal lichaamsgewicht), dan de huidige trede als die erbij is,
 * anders de laagste die past. Past er geen, dan de huidige trede; pas daarna de onderste.
 */
export function tredeVanSet(p: Progressie, s: LogSet): number {
  const label = zoekTrede(p, s.trede);
  if (label >= 0) return label;
  const huidig = zoekTrede(p, p.huidigeTrede);
  const passend = p.treden.map((t, i) => (lastPast(t, s) ? i : -1)).filter((i) => i >= 0);
  if (passend.length === 1) return passend[0];
  if (passend.length > 1) return passend.includes(huidig) ? huidig : passend[0];
  return huidig >= 0 ? huidig : p.treden.length ? 0 : -1;
}

/** De stand van één keer: de meest gebruikte trede of last in de werksets. */
export function standVan(sets: LogSet[], oef: Oefening): Stand {
  const p = oef.progressie;
  const werk = werkSets(sets);
  if (p?.modus === 'ladder') {
    const idx = meestVoorkomend(
      werk.map((s) => tredeVanSet(p, s)).filter((i) => i >= 0),
      (a, b) => a > b,
    );
    return idx === undefined ? {} : { trede: p.treden[idx], tredeIndex: idx };
  }
  const veld = lastVeld(oef);
  const kg = meestVoorkomend(
    werk.map((s) => s[veld]).filter((x): x is number => x !== undefined),
    (a, b) => a > b,
  );
  return kg === undefined ? {} : { kg };
}

function zelfdeStand(a: Stand, b: Stand): boolean {
  if (a.tredeIndex !== undefined || b.tredeIndex !== undefined) return a.tredeIndex === b.tredeIndex;
  return a.kg !== undefined && a.kg === b.kg;
}

/** De huidige stand uit de historiek, anders de huidige trede uit de oefening (of de eerste). */
export function huidigeStand(oef: Oefening, historiek: Gedaan[]): Stand {
  const p = oef.progressie;
  const laatste = [...historiek].reverse().find((g) => werkSets(g.sets).length > 0);
  const stand = laatste ? standVan(laatste.sets, oef) : {};
  if (p?.modus === 'ladder' && stand.tredeIndex === undefined && p.treden.length) {
    const i = Math.max(0, zoekTrede(p, p.huidigeTrede));
    return { trede: p.treden[i], tredeIndex: i };
  }
  return stand;
}

function repBereik(p: Progressie, stand: Stand): Bereik | undefined {
  return stand.trede?.repBereik ?? p.repBereik;
}
function duurBereik(p: Progressie, stand: Stand): Bereik | undefined {
  return stand.trede?.duurBereikSec ?? p.duurBereikSec;
}
function afstandBereik(p: Progressie, stand: Stand): Bereik | undefined {
  return stand.trede?.afstandBereikM ?? p.afstandBereikM;
}

// ---------- Evaluatie ----------

/**
 * Evalueert één keer tegen het criterium. Opwarmsets tellen niet. Een set met Gevecht of RIR 0 telt nooit
 * om te klimmen (behalve bij power, dat nooit op RIR gaat). De zwakke kant beslist.
 */
export function evalueer(sets: LogSet[], oef: Oefening, regels: Regels, stand: Stand = standVan(sets, oef)): Evaluatie {
  const p = oef.progressie;
  const werk = werkSets(sets);
  const redenen = new Set<Reden>();
  if (!p || werk.length === 0) return { gehaald: false, redenen: ['geenSets'], score: 0 };

  if (p.sets !== undefined && werk.length < p.sets) redenen.add('teWeinigSets');
  if (werk.some((s) => s.kwaliteit === 'gevecht')) redenen.add('gevecht');
  if (regels.criterium !== 'kwaliteit') {
    const doel = p.doelRIR;
    if (werk.some((s) => rirVan(s) === 0 || (doel !== undefined && (rirVan(s) ?? doel) < doel))) redenen.add('rirTeLaag');
  }

  const reps = werk.map(repsVan);
  const minReps = reps.every((r) => r !== undefined) ? Math.min(...(reps as number[])) : undefined;
  let score = 0;

  switch (regels.criterium) {
    case 'rir': {
      const b = repBereik(p, stand);
      score = reps.reduce<number>((n, r) => n + (r ?? 0), 0);
      if (!b) redenen.add('geenBereik');
      else if (reps.some((r) => r === undefined || r < b.max)) redenen.add('repsOnder');
      break;
    }
    case 'kwaliteit': {
      score = werk.filter((s) => s.kwaliteit === 'makkelijk').length;
      if (werk.some((s) => s.kwaliteit !== 'makkelijk')) redenen.add('kwaliteit');
      break;
    }
    case 'duur': {
      const b = duurBereik(p, stand);
      score = werk.reduce((n, s) => n + (s.duurSec ?? 0), 0);
      if (!b) redenen.add('geenBereik');
      else if (werk.some((s) => (s.duurSec ?? 0) < b.max)) redenen.add('duurOnder');
      break;
    }
    case 'afstand': {
      const b = afstandBereik(p, stand);
      score = werk.reduce((n, s) => n + (s.afstandM ?? 0), 0);
      if (!b) redenen.add('geenBereik');
      else if (werk.some((s) => (s.afstandM ?? 0) < b.max)) redenen.add('afstandOnder');
      break;
    }
  }
  return { gehaald: redenen.size === 0, redenen: [...redenen], score, minReps };
}

// ---------- Voorstel ----------

const ALTERNATIEF_VOLGORDE: ProgressieStap[] = ['reps', 'sets', 'tempo', 'pauze', 'variant'];

/** Welke alternatieven bij een profiel passen (zie docs/trainingsfilosofie.md). Geen profiel of anker/opbouw: de standaard. */
const PROFIEL_STAPPEN: Partial<Record<NonNullable<Progressie['profiel']>, ProgressieStap[]>> = {
  power: ['complexiteit', 'variant', 'last', 'pauze'],
  carry: ['houding', 'afstand', 'last'],
  isometrisch: ['duur', 'hefboom', 'last'],
};

/**
 * Alternatieven als er geen gewone stap is. Ze volgen het profiel: power nooit meer reps of trager tempo,
 * carry houding/afstand/last, isometrisch duur/hefboom/last. "Meer reps boven het bereik" alleen als de
 * bovenkant al gehaald werd. "Zwaarder" valt weg als het materiaal geen zwaardere stap heeft.
 */
function alternatieven(
  p: Progressie,
  stand: Stand,
  opties: { bovenkant: boolean; geenZwaarder?: boolean },
): Alternatief[] {
  const profiel = p.profiel ? PROFIEL_STAPPEN[p.profiel] : undefined;
  const toegelaten = profiel ?? [...p.volgorde, ...ALTERNATIEF_VOLGORDE].filter((s) => s !== 'last');
  // Een eigen volgorde bij de oefening gaat voor; de standaardvolgorde (reps → last → sets) niet bij een profiel.
  const eigenVolgorde = profiel && p.volgorde.join() === STANDAARD_VOLGORDE.join() ? [] : p.volgorde;
  const stappen = [...eigenVolgorde, ...toegelaten].filter(
    (s, i, all) =>
      all.indexOf(s) === i &&
      toegelaten.includes(s) &&
      !(s === 'last' && opties.geenZwaarder) &&
      !(s === 'reps' && !opties.bovenkant),
  );
  const b = repBereik(p, stand);
  const tekst: Record<ProgressieStap, string> = {
    reps: b ? `Meer reps: boven het bereik, ${b.max + 1}–${b.max + 2}` : 'Meer reps',
    last: 'Zwaardere last',
    sets: `Een extra set${p.sets ? ` (${p.sets + 1} sets)` : ''}`,
    tempo: 'Trager tempo, bv. 3 s excentrisch',
    pauze: 'Pauze van 1–2 s in de zwaarste positie',
    variant: 'Volgende variant (moeilijker) of zwaarder materiaal',
    duur: 'Langer vasthouden',
    afstand: 'Langere afstand',
    houding: 'Strakkere houding',
    hefboom: 'Langere hefboom',
    complexiteit: 'Complexere variant',
  };
  return stappen.map((stap) => ({ stap, tekst: tekst[stap] }));
}

function lastVanStand(oef: Oefening, stand: Stand): LastSpec | undefined {
  if (stand.trede) return stand.trede.last;
  if (stand.kg !== undefined) return { [lastVeld(oef)]: stand.kg };
  return undefined;
}

function basis(oef: Oefening, p: Progressie, stand: Stand, regels: Regels): Omit<Voorstel, 'type' | 'uitleg' | 'alternatieven'> {
  const v: Omit<Voorstel, 'type' | 'uitleg' | 'alternatieven'> = {
    trede: stand.trede?.label,
    last: lastVanStand(oef, stand),
    sets: p.sets,
    rir: regels.criterium === 'kwaliteit' ? undefined : p.doelRIR,
  };
  const r = repBereik(p, stand);
  if (r && (regels.criterium === 'rir' || oef.metingen.includes('reps'))) v.reps = r;
  const d = duurBereik(p, stand);
  if (d) v.duurSec = d.max;
  const a = afstandBereik(p, stand);
  if (a) v.afstandM = a.max;
  return v;
}

function kgTekst(n: number) {
  return `${formatGetal(n)} kg`;
}

/** Een zin over wat er ontbrak. */
function waaromNiet(ev: Evaluatie, oef: Oefening, p: Progressie, stand: Stand): string {
  const r = ev.redenen;
  if (r.includes('gevecht') || r.includes('rirTeLaag')) {
    return `Te zwaar gevochten (Gevecht of RIR onder ${formatGetal(p.doelRIR ?? 1)}): herhaal en blijf binnen de RIR.`;
  }
  if (r.includes('teWeinigSets')) return `Niet alle ${p.sets} sets gedaan: herhaal.`;
  if (r.includes('repsOnder')) {
    const b = repBereik(p, stand)!;
    const doel = Math.min(b.max, (ev.minReps ?? b.min) + 1);
    return `Nog niet ${b.max} reps in alle sets${oef.unilateraal ? ' (de zwakke kant telt)' : ''}: zelfde last, mik op ${doel}.`;
  }
  if (r.includes('duurOnder')) return `Houd langer vast: mik op ${duurBereik(p, stand)!.max} s in elke set.`;
  if (r.includes('afstandOnder')) return `Houding is goed: verleng de afstand naar ${afstandBereik(p, stand)!.max} m.`;
  if (r.includes('kwaliteit')) return 'Nog niet alles Makkelijk: zelfde trede, focus op snel en strak.';
  if (r.includes('geenBereik')) return 'Geen bereik ingesteld: herhaal, of stel een bereik in bij de oefening.';
  return 'Herhaal.';
}

/** Haalde de laatste keer de bovenkant van het repbereik in alle sets (ook als iets anders ontbrak)? */
function bovenkantGehaald(ev: Evaluatie, p: Progressie, stand: Stand): boolean {
  const b = repBereik(p, stand);
  return ev.gehaald || (b !== undefined && ev.minReps !== undefined && ev.minReps >= b.max);
}

/** Hoeveel keer op rij (vanaf de laatste) het criterium op dezelfde stand gehaald werd. */
function gehaaldOpRij(lijst: { stand: Stand; ev: Evaluatie }[]): number {
  const laatste = lijst[lijst.length - 1];
  let n = 0;
  for (let i = lijst.length - 1; i >= 0; i--) {
    if (!zelfdeStand(lijst[i].stand, laatste.stand) || !lijst[i].ev.gehaald) break;
    n++;
  }
  return n;
}

/** Stilstand: de laatste n keer op dezelfde stand, nooit gehaald en geen verbetering tegenover de eerste van die n. */
export function isGestagneerd(lijst: { stand: Stand; ev: Evaluatie }[], n: number): boolean {
  if (n < 2 || lijst.length < n) return false;
  const venster = lijst.slice(-n);
  if (!venster.every((x) => zelfdeStand(x.stand, venster[0].stand) && !x.ev.gehaald)) return false;
  return Math.max(...venster.slice(1).map((x) => x.ev.score)) <= venster[0].ev.score;
}

/**
 * Het voorstel voor de volgende keer, op basis van wat je echt gedaan hebt.
 * Volgorde: bovenkant gehaald (zo vaak op rij als het profiel vraagt) → klimmen (trede of kleinste laststap);
 * geen stap mogelijk → alternatieven; stilstand → lichter, wisselen of een alternatief; anders herhalen.
 */
export function maakVoorstel(ctx: Context, historiek: Gedaan[]): Voorstel {
  const { oefening: oef, filosofie } = ctx;
  const p = oef.progressie;
  if (!p) return { type: 'geen', uitleg: 'Geen progressie ingesteld: herhaal of pas zelf aan.', alternatieven: [] };

  const regels = regelsVoor(p, filosofie);
  const gedaan = historiek.filter((g) => werkSets(g.sets).length > 0);

  if (gedaan.length === 0) {
    const stand = huidigeStand(oef, []);
    const v = basis(oef, p, stand, regels);
    return {
      type: 'start',
      ...v,
      doelReps: v.reps?.min,
      uitleg:
        p.modus === 'ladder'
          ? `Nog niet gelogd: start op ${stand.trede?.label ?? 'de eerste trede'}, onderaan het bereik.`
          : 'Nog niet gelogd: kies een last die je onderaan het bereik haalt op de doel-RIR.',
      alternatieven: [],
    };
  }

  const lijst = gedaan.map((g) => {
    let stand = standVan(g.sets, oef);
    if (p.modus === 'ladder' && stand.tredeIndex === undefined) stand = huidigeStand(oef, []);
    return { stand, ev: evalueer(g.sets, oef, regels, stand) };
  });
  const { stand, ev } = lijst[lijst.length - 1];
  const v = basis(oef, p, stand, regels);
  const opRij = gehaaldOpRij(lijst);

  // 1. Gehaald, vaak genoeg op rij: klimmen.
  if (ev.gehaald && opRij >= regels.sessiesOpRij) {
    const waarom =
      regels.criterium === 'kwaliteit'
        ? `${opRij === 1 ? 'Strak' : `${opRij} keer op rij strak`}`
        : regels.criterium === 'duur'
          ? 'Volle duur in alle sets'
          : regels.criterium === 'afstand'
            ? 'Volle afstand met goede houding'
            : 'Bovenkant gehaald in alle sets';

    if (p.modus === 'ladder' && stand.tredeIndex !== undefined) {
      const volgende = p.treden[stand.tredeIndex + 1];
      if (volgende) {
        const nieuw = { trede: volgende, tredeIndex: stand.tredeIndex + 1 };
        const nb = basis(oef, p, nieuw, regels);
        return {
          type: 'klim',
          ...nb,
          doelReps: nb.reps?.min,
          uitleg: `${waarom} → klim naar ${volgende.label}${nb.reps ? `, terug naar ${nb.reps.min} reps` : ''}.`,
          alternatieven: [],
        };
      }
      return {
        type: 'alternatief',
        ...v,
        uitleg: `${waarom}, maar dit is de hoogste trede: kies een alternatief of voeg een trede toe.`,
        alternatieven: alternatieven(p, stand, { bovenkant: true }),
      };
    }

    if (stand.kg !== undefined) {
      const lasten = lastenVoor(oef.materiaalIds, ctx.materiaal);
      const nieuw = volgendeLast(stand.kg, lasten, p.kleinsteStapKg);
      if (nieuw !== undefined && (lasten.length > 0 || p.kleinsteStapKg)) {
        const stap = nieuw - stand.kg;
        const extra: Alternatief[] = [];
        if (p.profiel === 'opbouw' && stand.kg > 0 && stap / stand.kg > 0.1) {
          extra.push({ stap: 'reps', tekst: `De stap is groot (+${kgTekst(stap)}): verzamel eerst extra reps over de sets.` });
        }
        return {
          type: 'klim',
          ...v,
          last: { [lastVeld(oef)]: nieuw },
          doelReps: v.reps?.min,
          uitleg: `${waarom} → ${kgTekst(nieuw)} (+${kgTekst(stap)})${v.reps ? `, terug naar ${v.reps.min} reps` : ''}.`,
          alternatieven: extra,
        };
      }
      return {
        type: 'alternatief',
        ...v,
        uitleg: `${waarom}, maar je materiaal heeft geen zwaardere stap: kies een alternatief.`,
        alternatieven: alternatieven(p, stand, { bovenkant: true, geenZwaarder: true }),
      };
    }

    return {
      type: 'alternatief',
      ...v,
      uitleg: `${waarom}. Geen last of trede bekend: kies zelf de volgende stap.`,
      alternatieven: alternatieven(p, stand, { bovenkant: true }),
    };
  }

  // 2. Gehaald, maar nog niet vaak genoeg op rij (bv. power: 2 keer).
  if (ev.gehaald) {
    return {
      type: 'herhaal',
      ...v,
      uitleg: `Strak gehaald (${opRij}/${regels.sessiesOpRij}): nog eens zo voor je klimt.`,
      alternatieven: [],
    };
  }

  // 3. Stilstand.
  const st = regels.stagnatie;
  if (isGestagneerd(lijst, st.sessies)) {
    const kop = `${st.sessies} keer zonder vooruitgang`;
    if (st.actie === 'lichter') {
      if (stand.kg !== undefined && stand.kg > 0) {
        const lasten = lastenVoor(oef.materiaalIds, ctx.materiaal);
        const kg = lichter(stand.kg, st.percentage, lasten, p.kleinsteStapKg);
        if (kg < stand.kg) {
          return {
            type: 'lichter',
            ...v,
            last: { ...v.last, [lastVeld(oef)]: kg },
            doelReps: v.reps?.min,
            uitleg: `${kop} → ${formatGetal(st.percentage)}% lichter (${kgTekst(kg)}) en opnieuw opbouwen.`,
            alternatieven: [],
          };
        }
      }
      if (stand.tredeIndex !== undefined && stand.tredeIndex > 0) {
        const vorige = p.treden[stand.tredeIndex - 1];
        const nb = basis(oef, p, { trede: vorige, tredeIndex: stand.tredeIndex - 1 }, regels);
        return {
          type: 'lichter',
          ...nb,
          doelReps: nb.reps?.min,
          uitleg: `${kop} → een trede terug (${vorige.label}) en opnieuw opbouwen.`,
          alternatieven: [],
        };
      }
      // Laagste trede met een last: ~x% lichter als het materiaal een lichtere haalbare last heeft.
      if (stand.trede && stand.tredeIndex === 0) {
        const l = stand.trede.last;
        const veld = (l.gewichtKg ?? 0) > 0 ? 'gewichtKg' : (l.extraKg ?? 0) > 0 ? 'extraKg' : undefined;
        if (veld) {
          const ids = [...oef.materiaalIds, ...(l.materiaalId ? [l.materiaalId] : [])];
          const lasten = lastenVoor(ids, ctx.materiaal);
          const huidig = l[veld]!;
          const kg = lichter(huidig, st.percentage, lasten, p.kleinsteStapKg);
          if (kg < huidig && (lasten.length > 0 || p.kleinsteStapKg)) {
            return {
              type: 'lichter',
              ...v,
              last: { ...l, [veld]: kg },
              doelReps: v.reps?.min,
              uitleg: `${kop} op de laagste trede → ${formatGetal(st.percentage)}% lichter (${veld === 'extraKg' ? '+' : ''}${kgTekst(kg)}) en opnieuw opbouwen.`,
              alternatieven: [],
            };
          }
        }
      }
    }
    if (st.actie === 'wisselen') {
      return {
        type: 'wissel',
        ...v,
        uitleg: `${kop} → wissel naar een andere oefening in hetzelfde patroon (de teller start opnieuw).`,
        alternatieven: alternatieven(p, stand, { bovenkant: bovenkantGehaald(ev, p, stand) }),
      };
    }
    return {
      type: 'alternatief',
      ...v,
      uitleg: `${kop}: kies een alternatief.`,
      alternatieven: alternatieven(p, stand, { bovenkant: bovenkantGehaald(ev, p, stand) }),
    };
  }

  // 4. Herhalen, met een concreet doel.
  const r = v.reps;
  return {
    type: 'herhaal',
    ...v,
    doelReps: ev.redenen.includes('repsOnder') && r ? Math.min(r.max, (ev.minReps ?? r.min) + 1) : undefined,
    uitleg: waaromNiet(ev, oef, p, stand),
    alternatieven: [],
  };
}

/** Korte tekst voor het voorstel, bv. "Vest 10 · +10 kg × 5–8 · RIR 2". */
export function voorstelTekst(v: Voorstel): string {
  if (v.type === 'geen') return '';
  const delen: string[] = [];
  if (v.trede) delen.push(v.trede);
  const l = v.last ?? {};
  const last: string[] = [];
  if (!v.trede && l.variant) last.push(l.variant);
  if (l.gewichtKg !== undefined && l.gewichtKg > 0) last.push(kgTekst(l.gewichtKg));
  if (l.extraKg !== undefined && l.extraKg > 0) last.push(`+${kgTekst(l.extraKg)}`);
  let hoofd = last.join(' ');
  const reps =
    v.doelReps !== undefined ? `${v.doelReps}` : v.reps ? (v.reps.min === v.reps.max ? `${v.reps.min}` : `${v.reps.min}–${v.reps.max}`) : '';
  if (reps) hoofd += `${hoofd ? ' × ' : ''}${reps}`;
  if (hoofd) delen.push(hoofd);
  if (v.duurSec) delen.push(`${formatGetal(v.duurSec)} s`);
  if (v.afstandM) delen.push(`${formatGetal(v.afstandM)} m`);
  if (v.rir !== undefined) delen.push(`RIR ${formatGetal(v.rir)}`);
  return delen.join(' · ');
}

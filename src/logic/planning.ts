// Planning van programma's: datums uitrekenen, vandaag/gemist/volgende, inhalen of overslaan,
// de 48u-waarschuwing en de termijnen van ankers en rotaties. Alles puur.
import type { Filosofie, PlanStatus, Programma, ProgrammaSessie, Sjabloon, SjabloonGroep } from '../schema';
import { WEEKDAGEN } from '../schema';

export type Status = PlanStatus['status'];

export interface GeplandeSessie {
  /** "<programmaId>:<week>:<sessie>" */
  key: string;
  programmaId: string;
  programmaNaam: string;
  blokNaam: string;
  blokIndex: number;
  /** Weeknummer in het programma, vanaf 1 (herhaalde weken tellen mee). */
  week: number;
  weekLabel?: string;
  sessieIndex: number;
  /** Oorspronkelijke datum, JJJJ-MM-DD. */
  datum: string;
  tijd?: string;
  /** De sessie, met de aanpassing voor deze ene keer als die er is. */
  sessie: ProgrammaSessie;
  aangepast: boolean;
  status: Status;
  sessieId?: string;
  op?: string;
}

// ---------- Datums (JJJJ-MM-DD, zonder tijdzone-gedoe) ----------

function naarUtc(datum: string): number {
  const [j, m, d] = datum.split('-').map(Number);
  return Date.UTC(j, m - 1, d);
}

function vanUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function datumPlus(datum: string, dagen: number): string {
  return vanUtc(naarUtc(datum) + dagen * 86_400_000);
}

/** 1 = maandag … 7 = zondag. */
export function weekdagNummer(datum: string): number {
  const d = new Date(naarUtc(datum)).getUTCDay();
  return d === 0 ? 7 : d;
}

export function maandagVan(datum: string): string {
  return datumPlus(datum, 1 - weekdagNummer(datum));
}

export function dagenTussen(a: string, b: string): number {
  return Math.round((naarUtc(b) - naarUtc(a)) / 86_400_000);
}

/** De lokale datum van een tijdstip, als JJJJ-MM-DD. */
export function lokaleDatum(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------- Plannen ----------

export function planKey(programmaId: string, week: number, sessieIndex: number): string {
  return `${programmaId}:${week}:${sessieIndex}`;
}

/**
 * Alle geplande sessies van een programma, in volgorde van datum.
 * Week 1 is de week (ma–zo) van de startdatum; sessies vóór de startdatum vallen weg.
 */
export function planProgramma(p: Programma, statussen: PlanStatus[] = []): GeplandeSessie[] {
  const perKey = new Map(statussen.filter((s) => s.programmaId === p.id).map((s) => [s.id, s]));
  const maandag = maandagVan(p.startDatum);
  const uit: GeplandeSessie[] = [];
  let week = 0;
  p.blokken.forEach((blok, blokIndex) => {
    for (const w of blok.weken) {
      for (let h = 0; h < w.herhaal; h++) {
        week++;
        w.sessies.forEach((sessie, sessieIndex) => {
          const datum = datumPlus(maandag, (week - 1) * 7 + WEEKDAGEN.indexOf(sessie.weekdag));
          if (datum < p.startDatum) return;
          const key = planKey(p.id, week, sessieIndex);
          const st = perKey.get(key);
          uit.push({
            key,
            programmaId: p.id,
            programmaNaam: p.naam,
            blokNaam: blok.naam,
            blokIndex,
            week,
            weekLabel: w.label,
            sessieIndex,
            datum,
            tijd: sessie.tijd,
            sessie: st?.aanpassing ? { ...sessie, groepen: st.aanpassing.groepen } : sessie,
            aangepast: Boolean(st?.aanpassing),
            status: st?.status ?? 'gepland',
            sessieId: st?.sessieId,
            op: st?.op,
          });
        });
      }
    }
  });
  return uit.sort((a, b) => a.datum.localeCompare(b.datum) || (a.tijd ?? '').localeCompare(b.tijd ?? '') || a.sessieIndex - b.sessieIndex);
}

export function planAlles(programmas: Programma[], statussen: PlanStatus[]): GeplandeSessie[] {
  return programmas.flatMap((p) => planProgramma(p, statussen)).sort((a, b) => a.datum.localeCompare(b.datum));
}

/** Hoe ver terug de app naar gemiste sessies vraagt; oudere tellen als verlopen. */
export const GEMIST_VENSTER_DAGEN = 14;

export interface Vandaag {
  vandaag: GeplandeSessie[];
  gemist: GeplandeSessie[];
  volgende?: GeplandeSessie;
}

/** Wat er vandaag gepland staat, wat er (recent) gemist is, en wat er daarna komt. */
export function overzicht(gepland: GeplandeSessie[], vandaag: string): Vandaag {
  const open = gepland.filter((g) => g.status === 'gepland');
  return {
    vandaag: open.filter((g) => g.datum === vandaag),
    gemist: open.filter((g) => g.datum < vandaag && dagenTussen(g.datum, vandaag) <= GEMIST_VENSTER_DAGEN),
    volgende: open.find((g) => g.datum > vandaag),
  };
}

/** De toestand na het afsluiten van een geplande sessie: op de dag zelf "gedaan", later "ingehaald". */
export function statusNaAfsluiten(g: Pick<GeplandeSessie, 'key' | 'programmaId' | 'datum'>, sessieId: string, einde: Date, bestaand?: PlanStatus): PlanStatus {
  const dag = lokaleDatum(einde);
  const ingehaald = dag > g.datum;
  return {
    ...(bestaand ?? {}),
    id: g.key,
    programmaId: g.programmaId,
    datum: g.datum,
    status: ingehaald ? 'ingehaald' : 'gedaan',
    sessieId,
    ...(ingehaald ? { op: einde.toISOString() } : {}),
  };
}

export function overslaan(g: Pick<GeplandeSessie, 'key' | 'programmaId' | 'datum'>, bestaand?: PlanStatus): PlanStatus {
  return { ...(bestaand ?? {}), id: g.key, programmaId: g.programmaId, datum: g.datum, status: 'overgeslagen' };
}

/** Een geplande sessie als sjabloon, om ze te starten. */
export function alsSjabloon(g: GeplandeSessie): Sjabloon {
  return {
    id: g.key,
    naam: `${g.sessie.naam}`,
    notitie: g.sessie.notitie,
    opwarming: g.sessie.opwarming,
    groepen: g.sessie.groepen,
  };
}

/** Bewaart een aanpassing van de oefeningen voor één geplande sessie. */
export function pasAan(g: GeplandeSessie, groepen: SjabloonGroep[], bestaand?: PlanStatus): PlanStatus {
  return {
    ...(bestaand ?? { id: g.key, programmaId: g.programmaId, datum: g.datum, status: g.status }),
    aanpassing: { groepen },
  };
}

// ---------- 48u-waarschuwing ----------

export interface Botsing {
  wat: 'gelogd' | 'gepland';
  naam?: string;
  moment: Date;
  uren: number;
}

function momentVan(datum: string, tijd: string | undefined, referentie: Date): Date {
  const [j, m, d] = datum.split('-').map(Number);
  const [u, min] = tijd ? tijd.split(':').map(Number) : [referentie.getHours(), referentie.getMinutes()];
  return new Date(j, m - 1, d, u, min);
}

/**
 * Krachtsessies die minder dan minUren voor of na het gekozen moment liggen: de gelogde sessies ervoor,
 * en de geplande (nog open) sessies erna. Zonder uur rekent de app met hetzelfde uur als het gekozen moment.
 */
export function botsingen48u(
  moment: Date,
  gelogd: { start: string; soort?: string }[],
  gepland: GeplandeSessie[],
  minUren: number,
  zonderKey?: string,
): Botsing[] {
  const uit: Botsing[] = [];
  const uur = 3_600_000;
  for (const s of gelogd) {
    if (s.soort && s.soort !== 'kracht') continue;
    const t = new Date(s.start.length === 10 ? `${s.start}T${String(moment.getHours()).padStart(2, '0')}:00` : s.start);
    const verschil = (moment.getTime() - t.getTime()) / uur;
    if (verschil >= 0 && verschil < minUren) uit.push({ wat: 'gelogd', moment: t, uren: Math.round(verschil) });
  }
  for (const g of gepland) {
    if (g.status !== 'gepland' || g.key === zonderKey) continue;
    const t = momentVan(g.datum, g.tijd, moment);
    const verschil = (t.getTime() - moment.getTime()) / uur;
    if (verschil > 0 && verschil < minUren) uit.push({ wat: 'gepland', naam: g.sessie.naam, moment: t, uren: Math.round(verschil) });
  }
  return uit;
}

// ---------- Termijnen van ankers en rotaties ----------

export interface Termijn {
  oefeningId: string;
  rol: 'anker' | 'rotatie';
  /** Aantal weken van de eerste tot de laatste keer in het programma. */
  wekenGepland: number;
  /** Aantal weken tot vandaag (als de oefening al begonnen is). */
  wekenTotNu: number;
  min: number;
  max: number;
  /** Te lang: in het plan, of nu al. */
  teLang: boolean;
  nuTeLang: boolean;
}

/** Per oefening met een rol: hoe lang ze in het programma staat, tegen de termijn uit de instellingen. */
export function termijnen(gepland: GeplandeSessie[], filosofie: Filosofie, vandaag: string): Termijn[] {
  const perSleutel = new Map<string, { oefeningId: string; rol: 'anker' | 'rotatie'; eerste: string; laatste: string }>();
  for (const g of gepland) {
    if (g.status === 'overgeslagen') continue;
    for (const groep of g.sessie.groepen) {
      for (const it of groep.items) {
        if (!it.rol) continue;
        const k = `${g.programmaId}|${it.oefeningId}|${it.rol}`;
        const x = perSleutel.get(k);
        if (!x) perSleutel.set(k, { oefeningId: it.oefeningId, rol: it.rol, eerste: g.datum, laatste: g.datum });
        else {
          if (g.datum < x.eerste) x.eerste = g.datum;
          if (g.datum > x.laatste) x.laatste = g.datum;
        }
      }
    }
  }
  const uit: Termijn[] = [];
  for (const x of perSleutel.values()) {
    const bereik = x.rol === 'anker' ? filosofie.termijnen.ankerWeken : filosofie.termijnen.rotatieWeken;
    const wekenGepland = Math.floor(dagenTussen(maandagVan(x.eerste), maandagVan(x.laatste)) / 7) + 1;
    const tot = vandaag < x.eerste ? 0 : Math.floor(dagenTussen(maandagVan(x.eerste), maandagVan(vandaag < x.laatste ? vandaag : x.laatste)) / 7) + 1;
    uit.push({
      ...x,
      wekenGepland,
      wekenTotNu: tot,
      min: bereik.min,
      max: bereik.max,
      teLang: wekenGepland > bereik.max,
      nuTeLang: tot > bereik.max,
    });
  }
  return uit;
}

// ---------- Een geplande sessie aanpassen (alleen voor die ene keer) ----------

/** Haalt een oefening weg; een lege groep verdwijnt mee. */
export function verwijderItem(groepen: SjabloonGroep[], gi: number, ii: number): SjabloonGroep[] {
  return groepen
    .map((g, i) => (i === gi ? { ...g, items: g.items.filter((_, j) => j !== ii) } : g))
    .filter((g) => g.items.length > 0);
}

/** Vervangt een oefening; sets, reps, RIR, rust en rol blijven, een voorgeschreven last niet. */
export function vervangItem(groepen: SjabloonGroep[], gi: number, ii: number, oefeningId: string): SjabloonGroep[] {
  return groepen.map((g, i) =>
    i === gi ? { ...g, items: g.items.map((it, j) => (j === ii ? { ...it, oefeningId, last: undefined } : it)) } : g,
  );
}

/** Voegt een oefening toe als nieuwe groep achteraan. */
export function voegItemToe(groepen: SjabloonGroep[], oefeningId: string): SjabloonGroep[] {
  return [...groepen, { type: 'enkel', rondes: 1, items: [{ oefeningId }] }];
}

// Gegevens voor de grafieken in het overzichtspaneel. Puur: van historiek naar reeksen.
import type { LogSet, Oefening } from '../schema';
import { repsVan, werkSets, type Gedaan } from './progression';

export interface Punt {
  datum: string;
  /** Zwaarste werkset (kg, inclusief extra last). */
  topset?: number;
  /** Volume: som van last × reps (zonder last: som van de reps). */
  volume: number;
  /** Geschatte 1RM (Epley), alleen met last en hoogstens 12 reps. */
  e1rm?: number;
}

const rond1 = (n: number) => Math.round(n * 10) / 10;

/** De last van een set in kg: gewicht plus extra last; bij een vest/extra last ook het lichaamsgewicht als dat bekend is. */
export function setLast(s: LogSet, lichaamsgewichtKg?: number): number | undefined {
  const g = s.gewichtKg ?? 0;
  const e = s.extraKg ?? 0;
  if (s.gewichtKg === undefined && s.extraKg === undefined) return undefined;
  if (s.gewichtKg === undefined && lichaamsgewichtKg) return lichaamsgewichtKg + e;
  const totaal = g + e;
  return totaal > 0 ? totaal : undefined;
}

/** Epley: last × (1 + reps / 30). Alleen met last en 1–12 reps. */
export function epley(last: number | undefined, reps: number | undefined): number | undefined {
  if (!last || !reps || reps < 1 || reps > 12) return undefined;
  return rond1(reps === 1 ? last : last * (1 + reps / 30));
}

export function punten(historiek: Gedaan[], lichaamsgewichtKg?: number): Punt[] {
  return historiek
    .map((g): Punt | null => {
      const werk = werkSets(g.sets);
      if (werk.length === 0) return null;
      let topset: number | undefined;
      let e1rm: number | undefined;
      let volume = 0;
      for (const s of werk) {
        const last = setLast(s, lichaamsgewichtKg);
        const reps = repsVan(s) ?? 0;
        // Per kant: beide kanten tellen voor het volume.
        const volReps = s.reps ?? (s.repsLinks ?? 0) + (s.repsRechts ?? 0);
        volume += last ? last * volReps : volReps;
        if (last !== undefined && (topset === undefined || last > topset)) topset = last;
        const e = epley(last, reps);
        if (e !== undefined && (e1rm === undefined || e > e1rm)) e1rm = e;
      }
      return { datum: g.start.slice(0, 10), topset, volume: rond1(volume), e1rm };
    })
    .filter((p): p is Punt => p !== null);
}

/** Reps per trede of variant (zwakke kant), per keer. Voor een gestapelde grafiek. */
export function repsPerVariant(historiek: Gedaan[], oef: Pick<Oefening, 'progressie'>): {
  varianten: string[];
  rijen: ({ datum: string } & Record<string, number | string>)[];
} {
  const volgorde = oef.progressie?.treden.map((t) => t.label) ?? [];
  const gezien = new Set<string>();
  const rijen = historiek
    .map((g) => {
      const werk = werkSets(g.sets);
      if (werk.length === 0) return null;
      const rij: { datum: string } & Record<string, number | string> = { datum: g.start.slice(0, 10) };
      for (const s of werk) {
        const naam = s.trede ?? s.variant ?? '—';
        gezien.add(naam);
        rij[naam] = ((rij[naam] as number | undefined) ?? 0) + (repsVan(s) ?? 0);
      }
      return rij;
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
  const varianten = [...gezien].sort((a, b) => {
    const ia = volgorde.indexOf(a);
    const ib = volgorde.indexOf(b);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.localeCompare(b);
  });
  return { varianten, rijen };
}

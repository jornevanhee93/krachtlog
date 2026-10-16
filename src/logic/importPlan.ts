// Import van een bibliotheek- of logsbestand: koppelen aan wat er al is, ids vertalen.
import type {
  BibliotheekBestand,
  LastSpec,
  LogsBestand,
  Materiaal,
  Oefening,
  Programma,
  ProgrammaBestand,
  Sessie,
  Sjabloon,
  SjabloonGroep,
} from '../schema';
import { nieuwId } from './ids';
import { normaliseer, zoekMatch, type Match } from './matching';

export interface Bestaand {
  materiaal: Materiaal[];
  oefeningen: Oefening[];
  sjablonen: Sjabloon[];
  sessieIds: string[];
  /** Bestaande programma's (sinds fase 3; optioneel voor oudere aanroepen). */
  programmas?: Programma[];
}

export interface ImportPlan {
  materiaal: { bron: Materiaal; bestaandId?: string }[];
  oefeningen: { bron: Oefening; match: Match }[];
  sjablonen: { bron: Sjabloon; vervangtId?: string }[];
  sessies: { bron: Sessie; dubbel: boolean }[];
  programmas: { bron: Programma; vervangtId?: string }[];
}

/** Per oefening uit het bestand: het id van de bestaande oefening, of "nieuw". */
export type Keuzes = Record<string, string>;
export const NIEUW = 'nieuw';

export type ImportBestand = BibliotheekBestand | LogsBestand | ProgrammaBestand;

export function maakImportPlan(bestand: ImportBestand, bestaand: Bestaand): ImportPlan {
  const programmas = 'programma' in bestand ? [bestand.programma] : [];
  const materiaal = 'materiaal' in bestand ? bestand.materiaal : [];
  const sjablonen = 'sjablonen' in bestand ? bestand.sjablonen : [];
  const sessies = 'sessies' in bestand ? bestand.sessies : [];
  const sessieIds = new Set(bestaand.sessieIds);
  return {
    materiaal: materiaal.map((m) => ({
      bron: m,
      bestaandId: bestaand.materiaal.find((b) => normaliseer(b.naam) === normaliseer(m.naam))?.id,
    })),
    oefeningen: bestand.oefeningen.map((o) => ({ bron: o, match: zoekMatch(o, bestaand.oefeningen) })),
    sjablonen: sjablonen.map((s) => ({
      bron: s,
      vervangtId: bestaand.sjablonen.find((b) => normaliseer(b.naam) === normaliseer(s.naam))?.id,
    })),
    sessies: sessies.map((s) => ({ bron: s, dubbel: sessieIds.has(s.id) })),
    programmas: programmas.map((p) => ({
      bron: p,
      vervangtId: (bestaand.programmas ?? []).find((b) => normaliseer(b.naam) === normaliseer(p.naam))?.id,
    })),
  };
}

/** De oefeningen waarover de app moet vragen: koppelen of nieuw? */
export function twijfelgevallen(plan: ImportPlan) {
  return plan.oefeningen.filter((o) => o.match.type === 'twijfel');
}

export interface ImportResultaat {
  /** Op te slaan (nieuw of bijgewerkt). */
  materiaal: Materiaal[];
  oefeningen: Oefening[];
  sjablonen: Sjabloon[];
  sessies: Sessie[];
  programmas: Programma[];
  samenvatting: {
    materiaalNieuw: number;
    materiaalGekoppeld: number;
    oefeningenNieuw: number;
    oefeningenGekoppeld: number;
    sjablonenNieuw: number;
    sjablonenVervangen: number;
    sessiesNieuw: number;
    sessiesDubbel: number;
    programmasNieuw: number;
    programmasVervangen: number;
  };
}

function vrijId(gewenst: string, bezet: Set<string>, voorvoegsel: string): string {
  const id = bezet.has(gewenst) ? nieuwId(voorvoegsel) : gewenst;
  bezet.add(id);
  return id;
}

function uniek<T>(lijst: T[]): T[] {
  return [...new Set(lijst)];
}

/** Voert het plan uit met de keuzes van de gebruiker. Geeft terug wat er opgeslagen moet worden. */
export function voerImportUit(plan: ImportPlan, keuzes: Keuzes, bestaand: Bestaand): ImportResultaat {
  // 1. Materiaal: gekoppeld op naam, anders nieuw.
  const matIds = new Map<string, string>();
  const matBezet = new Set(bestaand.materiaal.map((m) => m.id));
  const materiaal: Materiaal[] = [];
  for (const { bron, bestaandId } of plan.materiaal) {
    if (bestaandId) {
      matIds.set(bron.id, bestaandId);
    } else {
      const id = vrijId(bron.id, matBezet, 'mat');
      matIds.set(bron.id, id);
      materiaal.push({ ...bron, id });
    }
  }
  const mapMat = (id: string) => matIds.get(id) ?? id;
  const mapLast = <T extends LastSpec | undefined>(last: T): T =>
    last?.materiaalId ? ({ ...last, materiaalId: mapMat(last.materiaalId) } as T) : last;

  // 2. Oefeningen: koppelen (exact of na keuze) of nieuw.
  const oefIds = new Map<string, string>();
  const oefBezet = new Set(bestaand.oefeningen.map((o) => o.id));
  const bijgewerkt = new Map(bestaand.oefeningen.map((o) => [o.id, o]));
  const gewijzigd = new Set<string>();
  const nieuweOef: Oefening[] = [];
  let gekoppeld = 0;

  for (const { bron, match } of plan.oefeningen) {
    const remapped: Oefening = {
      ...bron,
      materiaalIds: bron.materiaalIds.map(mapMat),
      progressie: bron.progressie && {
        ...bron.progressie,
        treden: bron.progressie.treden.map((t) => ({ ...t, last: mapLast(t.last) })),
      },
    };
    const keuze = match.type === 'exact' ? match.id : match.type === 'twijfel' ? (keuzes[bron.id] ?? NIEUW) : NIEUW;
    const doel = keuze !== NIEUW ? bijgewerkt.get(keuze) : undefined;
    if (doel) {
      oefIds.set(bron.id, doel.id);
      bijgewerkt.set(doel.id, vulAan(doel, remapped));
      gewijzigd.add(doel.id);
      gekoppeld++;
    } else {
      const id = vrijId(bron.id, oefBezet, 'oef');
      oefIds.set(bron.id, id);
      nieuweOef.push({ ...remapped, id });
    }
  }
  const mapOef = (id: string) => oefIds.get(id) ?? id;

  // 3. Sjablonen: zelfde naam = vervangen, anders nieuw.
  const sjabBezet = new Set(bestaand.sjablonen.map((s) => s.id));
  const sjablonen: Sjabloon[] = plan.sjablonen.map(({ bron, vervangtId }) => ({
    ...bron,
    id: vervangtId ?? vrijId(bron.id, sjabBezet, 'sjab'),
    groepen: bron.groepen.map((g) => ({
      ...g,
      items: g.items.map((it) => ({ ...it, oefeningId: mapOef(it.oefeningId), last: mapLast(it.last) })),
    })),
  }));
  const sjabIds = new Set([...bestaand.sjablonen.map((s) => s.id), ...sjablonen.map((s) => s.id)]);

  // 4. Sessies: dubbele (zelfde id als al aanwezig) worden overgeslagen.
  const sessies: Sessie[] = plan.sessies
    .filter((s) => !s.dubbel)
    .map(({ bron }) => {
      const s: Sessie = { ...bron, oefeningen: bron.oefeningen.map((o) => ({ ...o, oefeningId: mapOef(o.oefeningId) })) };
      if (s.sjabloonId && !sjabIds.has(s.sjabloonId)) delete s.sjabloonId;
      return s;
    });

  // 5. Programma's: zelfde naam = vervangen (de status van geplande sessies blijft), anders nieuw.
  const progBezet = new Set((bestaand.programmas ?? []).map((p) => p.id));
  const mapGroepen = (groepen: SjabloonGroep[]) =>
    groepen.map((g) => ({ ...g, items: g.items.map((it) => ({ ...it, oefeningId: mapOef(it.oefeningId), last: mapLast(it.last) })) }));
  const programmas: Programma[] = plan.programmas.map(({ bron, vervangtId }) => ({
    ...bron,
    id: vervangtId ?? vrijId(bron.id, progBezet, 'prog'),
    blokken: bron.blokken.map((b) => ({
      ...b,
      weken: b.weken.map((w) => ({ ...w, sessies: w.sessies.map((se) => ({ ...se, groepen: mapGroepen(se.groepen) })) })),
    })),
  }));

  return {
    programmas,
    materiaal,
    oefeningen: [...nieuweOef, ...[...gewijzigd].map((id) => bijgewerkt.get(id)!)],
    sjablonen,
    sessies,
    samenvatting: {
      materiaalNieuw: materiaal.length,
      materiaalGekoppeld: plan.materiaal.length - materiaal.length,
      oefeningenNieuw: nieuweOef.length,
      oefeningenGekoppeld: gekoppeld,
      sjablonenNieuw: plan.sjablonen.filter((s) => !s.vervangtId).length,
      sjablonenVervangen: plan.sjablonen.filter((s) => s.vervangtId).length,
      sessiesNieuw: sessies.length,
      sessiesDubbel: plan.sessies.length - sessies.length,
      programmasNieuw: plan.programmas.filter((p) => !p.vervangtId).length,
      programmasVervangen: plan.programmas.filter((p) => p.vervangtId).length,
    },
  };
}

/**
 * Een gekoppelde oefening houdt haar eigen gegevens. Wat nog leeg is, wordt aangevuld uit het bestand,
 * en de naam en aliassen uit het bestand komen erbij als alias (zo koppelt de volgende import vanzelf).
 */
export function vulAan(bestaand: Oefening, uitBestand: Oefening): Oefening {
  const bekend = new Set([bestaand.naam, ...bestaand.aliassen].map(normaliseer));
  const extraAliassen = [uitBestand.naam, ...uitBestand.aliassen].filter((n) => {
    const k = normaliseer(n);
    if (!k || bekend.has(k)) return false;
    bekend.add(k);
    return true;
  });
  const leeg = <T>(a: T[], b: T[]) => (a.length ? a : uniek(b));
  return {
    ...bestaand,
    aliassen: [...bestaand.aliassen, ...extraAliassen],
    patronen: leeg(bestaand.patronen, uitBestand.patronen),
    materiaalIds: leeg(bestaand.materiaalIds, uitBestand.materiaalIds),
    cues: leeg(bestaand.cues, uitBestand.cues),
    valkuilen: leeg(bestaand.valkuilen, uitBestand.valkuilen),
    videolinks: leeg(bestaand.videolinks, uitBestand.videolinks),
    tags: leeg(bestaand.tags, uitBestand.tags),
    spieren:
      bestaand.spieren.primair.length || bestaand.spieren.secundair.length ? bestaand.spieren : uitBestand.spieren,
    notities: bestaand.notities ?? uitBestand.notities,
    progressie: bestaand.progressie ?? uitBestand.progressie,
  };
}

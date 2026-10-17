// De lopende sessie: aanmaken, sets afvinken, springen in supersets, afsluiten.
// Alles puur: elke functie geeft een nieuwe sessie terug.
import type {
  GroepType,
  LastSpec,
  LogSet,
  Oefening,
  Sessie,
  Sjabloon,
  SjabloonGroep,
  SjabloonItem,
} from '../schema';
import { nieuwId } from './ids';
import { normaliseer } from './matching';
import type { Voorstel } from './progression';

export const STANDAARD_RUST_SEC = 90;
export const STANDAARD_SETS = 3;

export interface DraftSet extends LogSet {
  klaar: boolean;
}

export interface ItemDoel {
  sets?: number;
  repBereik?: { min: number; max: number };
  doelRIR?: number;
  rustSec?: number;
  rol?: 'anker' | 'rotatie';
  last?: LastSpec;
  notitie?: string;
}

export interface ActiveItem {
  key: string;
  oefeningId: string;
  doel: ItemDoel;
  sets: DraftSet[];
  notitie?: string;
  /** Vervangen tijdens de training: de oefening blijft staan met alleen haar gedane sets. */
  vervangen?: boolean;
}

export interface ActiveGroup {
  key: string;
  label?: string;
  type: GroepType;
  rondes: number;
  rustTussenRondesSec?: number;
  rustTussenOefeningenSec?: number;
  duurSec?: number;
  intervalSec?: number;
  notitie?: string;
  items: ActiveItem[];
}

export interface Focus {
  groep: number;
  item: number;
}

export interface ActiveSession {
  id: string;
  start: string;
  sjabloonId?: string;
  sjabloonNaam?: string;
  /** De geplande sessie uit een programma, als de training daaruit gestart werd. */
  planningId?: string;
  opwarming: string[];
  groepen: ActiveGroup[];
  focus: Focus | null;
  /** Lopende rusttimer: eindtijd in ms sinds 1970. */
  rust?: { eindigtOp: number; duurSec: number };
  /** Lopende groepstimer (AMRAP/EMOM): starttijd in ms. */
  groepTimer?: { groepKey: string; gestartOp: number };
}

/** De vorige keer dat een oefening gedaan werd (alleen de sets zijn nodig). */
export type VorigeSets = Record<string, LogSet[] | undefined>;

/** Voorstellen per oefening-id (uit de progressielogica). */
export type Voorstellen = Record<string, Voorstel | undefined>;

/**
 * Neemt een voorstel over in een geplande werkset, alleen als het een nieuwe stand is (klimmen of lichter):
 * de trede en de last, en de reps terug naar het doel. Bij herhalen blijven de waarden van de vorige keer staan.
 */
export function pasVoorstelToe(set: LogSet, v: Voorstel | undefined, oefening: Oefening | undefined): LogSet {
  if (!v || (v.type !== 'klim' && v.type !== 'lichter')) return set;
  const uit: LogSet = { ...set };
  if (v.trede) uit.trede = v.trede;
  const l = v.last ?? {};
  if (l.gewichtKg !== undefined) uit.gewichtKg = l.gewichtKg;
  if (l.extraKg !== undefined) uit.extraKg = l.extraKg;
  else if (v.trede && uit.extraKg !== undefined) uit.extraKg = 0;
  if (v.trede) {
    uit.variant = l.variant;
    uit.tempo = l.tempo;
  }
  if (v.doelReps !== undefined && oefening?.metingen.includes('reps')) {
    if (oefening.unilateraal) {
      uit.repsLinks = v.doelReps;
      uit.repsRechts = v.doelReps;
    } else {
      uit.reps = v.doelReps;
    }
  }
  // Duur en afstand zoals in het voorstel (na een klim of een stap lichter: de onderkant van het bereik).
  if (v.duurSec !== undefined && oefening?.metingen.includes('tijd')) zetPerKant(uit, 'duurSec', v.duurSec, oefening);
  if (v.afstandM !== undefined && oefening?.metingen.includes('afstand')) zetPerKant(uit, 'afstandM', v.afstandM, oefening);
  return schoon(uit);
}

/** Zet duur of afstand: bij een unilaterale oefening links en rechts, anders het gewone veld. */
function zetPerKant(set: LogSet, veld: 'duurSec' | 'afstandM', waarde: number, oefening: Oefening | undefined) {
  if (oefening?.unilateraal) {
    set[`${veld}Links`] = waarde;
    set[`${veld}Rechts`] = waarde;
    delete set[veld];
  } else {
    set[veld] = waarde;
  }
}

/** Een oude set met één duur of afstand bij een unilaterale oefening: dezelfde waarde voor beide kanten. */
function perKantVoor(set: LogSet, oefening: Oefening | undefined): LogSet {
  if (!oefening?.unilateraal) return set;
  const uit = { ...set };
  if (uit.duurSec !== undefined && uit.duurSecLinks === undefined && uit.duurSecRechts === undefined) zetPerKant(uit, 'duurSec', uit.duurSec, oefening);
  if (uit.afstandM !== undefined && uit.afstandMLinks === undefined && uit.afstandMRechts === undefined) zetPerKant(uit, 'afstandM', uit.afstandM, oefening);
  return uit;
}

const WAARDE_VELDEN = [
  'gewichtKg',
  'extraKg',
  'trede',
  'variant',
  'tempo',
  'reps',
  'repsLinks',
  'repsRechts',
  'duurSec',
  'duurSecLinks',
  'duurSecRechts',
  'afstandM',
  'afstandMLinks',
  'afstandMRechts',
] as const;

/** Neemt alleen de waarden over (geen RIR, kwaliteit of notitie: die vul je elke keer opnieuw in). */
export function kopieerWaarden(set: Partial<LogSet>): LogSet {
  const uit: LogSet = { opwarm: false };
  for (const veld of WAARDE_VELDEN) {
    if (set[veld] !== undefined) (uit as Record<string, unknown>)[veld] = set[veld];
  }
  return uit;
}

function huidigeTredeLast(oefening: Oefening | undefined): { trede?: string; last?: LastSpec; duurBereikSec?: Bereik; afstandBereikM?: Bereik } {
  const p = oefening?.progressie;
  if (!p || p.modus !== 'ladder' || p.treden.length === 0) return {};
  const t = p.treden.find((x) => x.label.toLowerCase() === p.huidigeTrede?.toLowerCase()) ?? p.treden[0];
  return { trede: t.label, last: t.last, duurBereikSec: t.duurBereikSec, afstandBereikM: t.afstandBereikM };
}

type Bereik = { min: number; max: number };

/**
 * Startwaarden voor een set als er geen vorige keer is: uit het sjabloon of de ladder.
 * Duur en afstand zoals reps: een vaste waarde uit de last (sjabloon, dan trede), anders de onderkant van het
 * bereik (van de trede, anders van de progressie). Is er nergens een bereik, dan blijven ze leeg: geen 0 s of 0 m.
 */
function startSet(doel: ItemDoel, oefening: Oefening | undefined): LogSet {
  const ladder = huidigeTredeLast(oefening);
  const p = oefening?.progressie;
  const duurStart = ladder.duurBereikSec?.min ?? p?.duurBereikSec?.min;
  const afstandStart = ladder.afstandBereikM?.min ?? p?.afstandBereikM?.min;
  const last = { ...ladder.last, ...doel.last };
  const set: LogSet = { opwarm: false };
  if (ladder.trede) set.trede = ladder.trede;
  if (last.gewichtKg !== undefined) set.gewichtKg = last.gewichtKg;
  if (last.extraKg !== undefined) set.extraKg = last.extraKg;
  if (last.variant) set.variant = last.variant;
  if (last.tempo) set.tempo = last.tempo;
  if (last.duurSec !== undefined) zetPerKant(set, 'duurSec', last.duurSec, oefening);
  if (last.afstandM !== undefined) zetPerKant(set, 'afstandM', last.afstandM, oefening);
  const metingen = oefening?.metingen ?? ['gewicht', 'reps'];
  const reps = doel.repBereik?.min ?? oefening?.progressie?.repBereik?.min;
  if (metingen.includes('reps')) {
    if (oefening?.unilateraal) {
      set.repsLinks = reps ?? 0;
      set.repsRechts = reps ?? 0;
    } else {
      set.reps = reps ?? 0;
    }
  }
  if (metingen.includes('gewicht') && set.gewichtKg === undefined) set.gewichtKg = 0;
  if (metingen.includes('tijd') && last.duurSec === undefined && duurStart !== undefined) zetPerKant(set, 'duurSec', duurStart, oefening);
  if (metingen.includes('afstand') && last.afstandM === undefined && afstandStart !== undefined) zetPerKant(set, 'afstandM', afstandStart, oefening);
  return set;
}

/**
 * De meting die nog leeg is en die de snelle knop niet zelf mag invullen: tijd of afstand zonder waarde
 * (geen vorige keer en geen bereik). Dan logt de knop niets en opent hij het invulblok.
 */
export function ontbrekendeMeting(set: LogSet, oefening: Oefening | undefined): 'tijd' | 'afstand' | undefined {
  const metingen = oefening?.metingen ?? [];
  if (metingen.includes('tijd') && set.duurSec === undefined && set.duurSecLinks === undefined && set.duurSecRechts === undefined) return 'tijd';
  if (metingen.includes('afstand') && set.afstandM === undefined && set.afstandMLinks === undefined && set.afstandMRechts === undefined) {
    return 'afstand';
  }
  return undefined;
}

/**
 * Een set zonder trede bij een ladder (bv. geïmporteerd) krijgt de trede van het voorstel, anders de huidige trede,
 * zodat het veld "Trede" niet leeg staat terwijl het voorstel een trede noemt. De gelogde last blijft staan.
 */
function vulTrede(set: LogSet, v: Voorstel | undefined, oefening: Oefening | undefined): LogSet {
  const p = oefening?.progressie;
  if (set.trede || !p || p.modus !== 'ladder' || p.treden.length === 0) return set;
  const label = v?.trede ?? huidigeTredeLast(oefening).trede;
  const trede = p.treden.find((t) => t.label === label);
  if (!trede) return set;
  const uit: LogSet = { ...set, trede: trede.label };
  if (uit.variant === undefined && trede.last.variant) uit.variant = trede.last.variant;
  if (uit.tempo === undefined && trede.last.tempo) uit.tempo = trede.last.tempo;
  return uit;
}

function aantalSets(groep: Pick<ActiveGroup, 'type' | 'rondes' | 'duurSec' | 'intervalSec'>, doel: ItemDoel, vorige?: LogSet[]) {
  switch (groep.type) {
    case 'superset':
    case 'circuit':
      return groep.rondes;
    case 'emom':
      return groep.duurSec ? Math.max(1, Math.floor(groep.duurSec / (groep.intervalSec || 60))) : groep.rondes;
    case 'amrap':
      return 1;
    case 'enkel': {
      const werk = vorige?.filter((s) => !s.opwarm).length;
      return doel.sets ?? (werk || undefined) ?? STANDAARD_SETS;
    }
  }
}

/** Plant de sets voor een oefening: de waarden van de vorige keer, anders uit het sjabloon of de ladder. */
export function planSets(
  groep: Pick<ActiveGroup, 'type' | 'rondes' | 'duurSec' | 'intervalSec'>,
  doel: ItemDoel,
  oefening: Oefening | undefined,
  vorige: LogSet[] | undefined,
  voorstel?: Voorstel,
): DraftSet[] {
  const werk = vorige?.filter((s) => !s.opwarm) ?? [];
  const n = aantalSets(groep, doel, vorige);
  const metRonde = groep.type !== 'enkel';
  return Array.from({ length: n }, (_, i) => {
    const bron = werk.length ? perKantVoor(kopieerWaarden(werk[Math.min(i, werk.length - 1)]), oefening) : startSet(doel, oefening);
    const set: DraftSet = { ...vulTrede(pasVoorstelToe(bron, voorstel, oefening), voorstel, oefening), opwarm: false, klaar: false };
    if (metRonde) set.ronde = i + 1;
    return set;
  });
}

function itemDoel(item: SjabloonItem): ItemDoel {
  const { sets, repBereik, doelRIR, rustSec, rol, last, notitie } = item;
  return { sets, repBereik, doelRIR, rustSec, rol, last, notitie };
}

function groepUitSjabloon(
  g: SjabloonGroep,
  oefeningen: Map<string, Oefening>,
  vorige: VorigeSets,
  voorstellen: Voorstellen,
): ActiveGroup {
  const groep: ActiveGroup = {
    key: nieuwId('grp'),
    label: g.label,
    type: g.type,
    rondes: g.rondes,
    rustTussenRondesSec: g.rustTussenRondesSec,
    rustTussenOefeningenSec: g.rustTussenOefeningenSec,
    duurSec: g.duurSec,
    intervalSec: g.intervalSec,
    notitie: g.notitie,
    items: [],
  };
  groep.items = g.items.map((it) => {
    const doel = itemDoel(it);
    return {
      key: nieuwId('itm'),
      oefeningId: it.oefeningId,
      doel,
      sets: planSets(groep, doel, oefeningen.get(it.oefeningId), vorige[it.oefeningId], voorstellen[it.oefeningId]),
    };
  });
  return groep;
}

/** Start een sessie vanuit een sjabloon, of leeg (zonder sjabloon). */
export function startSessie(
  sjabloon: Sjabloon | undefined,
  oefeningen: Oefening[],
  vorige: VorigeSets,
  nu: Date = new Date(),
  voorstellen: Voorstellen = {},
): ActiveSession {
  const map = new Map(oefeningen.map((o) => [o.id, o]));
  const groepen = sjabloon ? sjabloon.groepen.map((g) => groepUitSjabloon(g, map, vorige, voorstellen)) : [];
  return {
    id: nieuwId('ses'),
    start: nu.toISOString(),
    sjabloonId: sjabloon?.id,
    sjabloonNaam: sjabloon?.naam,
    opwarming: sjabloon?.opwarming ?? [],
    groepen,
    focus: groepen.length ? { groep: 0, item: 0 } : null,
  };
}

/** Voegt een oefening toe als nieuwe groep (enkel) achteraan. */
export function voegOefeningToe(
  s: ActiveSession,
  oefening: Oefening,
  vorige: LogSet[] | undefined,
  voorstel?: Voorstel,
): ActiveSession {
  const groep: ActiveGroup = { key: nieuwId('grp'), type: 'enkel', rondes: 1, items: [] };
  groep.items = [{ key: nieuwId('itm'), oefeningId: oefening.id, doel: {}, sets: planSets(groep, {}, oefening, vorige, voorstel) }];
  const groepen = [...s.groepen, groep];
  return { ...s, groepen, focus: { groep: groepen.length - 1, item: 0 } };
}

/**
 * Wat een vervanger van de oude oefening overneemt: alleen de structuur (sets, rust, rol).
 * Last, repbereik, RIR en notitie horen bij de oude oefening; de vervanger gebruikt zijn eigen voorstel,
 * zijn vorige keer of zijn eigen ladder en bereik.
 */
function structuurVan(doel: ItemDoel): ItemDoel {
  return schoon({ sets: doel.sets, rustSec: doel.rustSec, rol: doel.rol });
}

/**
 * Vervangt een oefening. Gedane sets gaan nooit verloren: is er al een set afgevinkt, dan blijft de oude
 * oefening staan met alleen haar gedane sets, en komt de nieuwe er meteen achter met de resterende werksets.
 * Zonder gedane sets wordt de oefening gewoon vervangen. De nieuwe oefening krijgt haar eigen voorschrift
 * (zie structuurVan); de plaats in de groep, het aantal sets of rondes en de rust blijven.
 */
export function vervangOefening(
  s: ActiveSession,
  pos: Focus,
  oefening: Oefening,
  vorige: LogSet[] | undefined,
  voorstel?: Voorstel,
): ActiveSession {
  const groep = s.groepen[pos.groep];
  const item = groep?.items[pos.item];
  if (!item) return s;
  const doel = structuurVan(item.doel);
  const gepland = planSets(groep, doel, oefening, vorige, voorstel);
  const gedaan = item.sets.filter((x) => x.klaar);
  if (gedaan.length === 0) {
    return updateItem(s, pos, () => ({
      ...item,
      oefeningId: oefening.id,
      doel,
      sets: gepland.map((set, i) => (item.sets[i]?.ronde !== undefined ? { ...set, ronde: item.sets[i].ronde } : set)),
    }));
  }
  const open = item.sets.filter((x) => !x.klaar && !x.opwarm);
  const n = open.length || gepland.length;
  const sets = Array.from({ length: n }, (_, i) => {
    const set: DraftSet = { ...gepland[Math.min(i, gepland.length - 1)] };
    if (open[i]?.ronde !== undefined) set.ronde = open[i].ronde;
    return set;
  });
  const oud: ActiveItem = { ...item, sets: gedaan, vervangen: true };
  const nieuw: ActiveItem = { key: nieuwId('itm'), oefeningId: oefening.id, doel, sets };
  const groepen = s.groepen.map((g, gi) =>
    gi === pos.groep ? { ...g, items: g.items.flatMap((it, ii) => (ii === pos.item ? [oud, nieuw] : [it])) } : g,
  );
  return { ...s, groepen, focus: { groep: pos.groep, item: pos.item + 1 } };
}

/** Verwijdert een oefening; een lege groep verdwijnt mee. */
export function verwijderOefening(s: ActiveSession, pos: Focus): ActiveSession {
  const groepen = s.groepen
    .map((g, gi) => (gi === pos.groep ? { ...g, items: g.items.filter((_, ii) => ii !== pos.item) } : g))
    .filter((g) => g.items.length > 0);
  return { ...s, groepen, focus: eersteOpen(groepen) };
}

export function updateItem(
  s: ActiveSession,
  pos: Focus,
  fn: (item: ActiveItem, groep: ActiveGroup) => ActiveItem,
): ActiveSession {
  return {
    ...s,
    groepen: s.groepen.map((g, gi) =>
      gi === pos.groep ? { ...g, items: g.items.map((it, ii) => (ii === pos.item ? fn(it, g) : it)) } : g,
    ),
  };
}

export function updateSet(s: ActiveSession, pos: Focus, setIndex: number, patch: Partial<DraftSet>): ActiveSession {
  return updateItem(s, pos, (item) => ({
    ...item,
    sets: item.sets.map((set, i) => (i === setIndex ? { ...set, ...patch } : set)),
  }));
}

/** Power gaat nooit op RIR, alleen op kwaliteit (zie docs/trainingsfilosofie.md). */
export function zonderRir(oefening: Oefening | undefined): boolean {
  return oefening?.progressie?.profiel === 'power';
}

/** De RIR die de snelle knop voorstelt: de ingevulde RIR, anders de doel-RIR (sjabloon, dan oefening). Opwarmsets en power: geen. */
export function snelleRir(set: LogSet, doel: ItemDoel, oefening: Oefening | undefined): number | undefined {
  if (set.opwarm || zonderRir(oefening)) return undefined;
  return set.rir ?? doel.doelRIR ?? oefening?.progressie?.doelRIR;
}

/** De set zoals de snelle knop hem afvinkt: een werkset zonder RIR krijgt de voorgestelde RIR. */
export function snelleSet<T extends LogSet>(set: T, doel: ItemDoel, oefening: Oefening | undefined): T {
  if (set.rir !== undefined || set.rirLinks !== undefined || set.rirRechts !== undefined) return set;
  const rir = snelleRir(set, doel, oefening);
  return rir === undefined ? set : { ...set, rir };
}

/** Eén tik op de snelle knop: de voorgevulde waarden (met de voorgestelde RIR) bewaren en "Set klaar". */
export function snelKlaar(s: ActiveSession, pos: Focus, setIndex: number, oefening: Oefening | undefined, nu: number = Date.now()): ActiveSession {
  const item = s.groepen[pos.groep]?.items[pos.item];
  const set = item?.sets[setIndex];
  if (!item || !set || set.klaar || ontbrekendeMeting(set, oefening)) return s;
  const gevuld = snelleSet(set, item.doel, oefening);
  return setKlaar(updateSet(s, pos, setIndex, gevuld), pos, setIndex, nu);
}

/** Voegt een opwarmset toe vóór de werksets, met de waarden van de eerste werkset. */
export function voegOpwarmsetToe(s: ActiveSession, pos: Focus): ActiveSession {
  return updateItem(s, pos, (item) => {
    const eerste = item.sets.find((x) => !x.opwarm);
    const nieuw: DraftSet = { ...kopieerWaarden(eerste ?? {}), opwarm: true, klaar: false };
    const aantalOpwarm = item.sets.filter((x) => x.opwarm).length;
    const sets = [...item.sets];
    sets.splice(aantalOpwarm, 0, nieuw);
    return { ...item, sets };
  });
}

/** Voegt een extra werkset toe met de waarden van de laatste set. */
export function voegSetToe(s: ActiveSession, pos: Focus): ActiveSession {
  return updateItem(s, pos, (item, groep) => {
    const werk = item.sets.filter((x) => !x.opwarm);
    const laatste = werk[werk.length - 1];
    const nieuw: DraftSet = { ...kopieerWaarden(laatste ?? {}), opwarm: false, klaar: false };
    if (groep.type !== 'enkel') nieuw.ronde = (laatste?.ronde ?? 0) + 1;
    return { ...item, sets: [...item.sets, nieuw] };
  });
}

export function verwijderSet(s: ActiveSession, pos: Focus, setIndex: number): ActiveSession {
  return updateItem(s, pos, (item) => ({ ...item, sets: item.sets.filter((_, i) => i !== setIndex) }));
}

/** Index van de eerstvolgende set die nog niet klaar is (opwarmsets eerst), of -1. */
export function volgendeSet(item: ActiveItem): number {
  return item.sets.findIndex((x) => !x.klaar);
}

/** Opent een oefening; tik je op de oefening die al open is, dan klapt ze dicht. */
export function wisselOpen(s: ActiveSession, pos: Focus): ActiveSession {
  const open = s.focus?.groep === pos.groep && s.focus.item === pos.item;
  return { ...s, focus: open ? null : pos };
}

/** Samenvatting voor een dichte kaart: voortgang en de laatst afgewerkte werkset. */
export function itemVoortgang(item: ActiveItem): { klaar: number; totaal: number; laatste?: LogSet; afgewerkt: boolean } {
  const werk = item.sets.filter((x) => !x.opwarm);
  const gedaan = werk.filter((x) => x.klaar);
  const laatste = gedaan.at(-1);
  return {
    klaar: gedaan.length,
    totaal: werk.length,
    laatste: laatste ? (({ klaar: _k, ...rest }) => rest)(laatste) : undefined,
    afgewerkt: item.sets.length > 0 && volgendeSet(item) < 0,
  };
}

/** Is elke set van elke oefening afgevinkt? */
export function allesAfgewerkt(s: ActiveSession): boolean {
  return s.groepen.length > 0 && s.groepen.every((g) => g.items.every((it) => volgendeSet(it) < 0));
}

function eersteOpen(groepen: ActiveGroup[]): Focus | null {
  for (let g = 0; g < groepen.length; g++) {
    for (let i = 0; i < groepen[g].items.length; i++) {
      if (volgendeSet(groepen[g].items[i]) >= 0) return { groep: g, item: i };
    }
  }
  return null;
}

/**
 * Markeert een set als klaar en bepaalt wat er daarna komt:
 * - enkel: rust, en dezelfde oefening blijft in beeld tot alle sets klaar zijn
 * - superset/circuit: naar de volgende oefening van de groep; rust tussen oefeningen of na een ronde
 * - amrap/emom: naar de volgende oefening, zonder rusttimer; een AMRAP krijgt automatisch een nieuwe ronde
 */
export function setKlaar(s: ActiveSession, pos: Focus, setIndex: number, nu: number = Date.now()): ActiveSession {
  const groep = s.groepen[pos.groep];
  const item = groep.items[pos.item];
  const wasOpwarm = item.sets[setIndex]?.opwarm;
  let volgende = updateSet(s, pos, setIndex, { klaar: true });
  let g = volgende.groepen[pos.groep];

  // AMRAP: is de ronde voor alle oefeningen klaar, dan komt er een nieuwe ronde bij.
  if (g.type === 'amrap' && g.items.every((it) => volgendeSet(it) < 0)) {
    volgende = {
      ...volgende,
      groepen: volgende.groepen.map((gr, gi) =>
        gi === pos.groep
          ? {
              ...gr,
              items: gr.items.map((it) => {
                const laatste = it.sets.filter((x) => !x.opwarm).at(-1);
                const nieuw: DraftSet = { ...kopieerWaarden(laatste ?? {}), opwarm: false, klaar: false };
                nieuw.ronde = (laatste?.ronde ?? 0) + 1;
                return { ...it, sets: [...it.sets, nieuw] };
              }),
            }
          : gr,
      ),
    };
    g = volgende.groepen[pos.groep];
  }

  let focus: Focus | null = pos;
  let rustSec: number | undefined;

  if (wasOpwarm) {
    rustSec = undefined; // na een opwarmset geen timer
  } else if (g.type === 'enkel') {
    rustSec = item.doel.rustSec ?? g.rustTussenRondesSec ?? STANDAARD_RUST_SEC;
    if (volgendeSet(g.items[pos.item]) < 0) focus = eersteOpenNa(volgende.groepen, pos);
  } else {
    // Volgende oefening in de groep die het minst ver is (zo blijft de volgorde A1 → A2 → A1 …).
    const n = g.items.length;
    let gekozen: number | null = null;
    for (let stap = 1; stap <= n; stap++) {
      const kandidaat = (pos.item + stap) % n;
      if (volgendeSet(g.items[kandidaat]) >= 0) {
        gekozen = kandidaat;
        break;
      }
    }
    if (gekozen === null) {
      focus = eersteOpenNa(volgende.groepen, pos);
      if (g.type === 'superset' || g.type === 'circuit') rustSec = g.rustTussenRondesSec ?? item.doel.rustSec;
    } else {
      focus = { groep: pos.groep, item: gekozen };
      // Terug naar een eerdere oefening in de groep = einde van een ronde.
      const rondeKlaar = gekozen <= pos.item;
      if (g.type === 'superset' || g.type === 'circuit') {
        rustSec = rondeKlaar
          ? (g.rustTussenRondesSec ?? item.doel.rustSec ?? STANDAARD_RUST_SEC)
          : (item.doel.rustSec ?? g.rustTussenOefeningenSec);
      }
    }
  }

  const rust = rustSec && rustSec > 0 ? { eindigtOp: nu + rustSec * 1000, duurSec: rustSec } : undefined;
  return { ...volgende, focus, rust };
}

function eersteOpenNa(groepen: ActiveGroup[], pos: Focus): Focus | null {
  for (let g = pos.groep; g < groepen.length; g++) {
    for (let i = 0; i < groepen[g].items.length; i++) {
      if (volgendeSet(groepen[g].items[i]) >= 0) return { groep: g, item: i };
    }
  }
  return eersteOpen(groepen);
}

export interface Afsluiting {
  einde: string;
  duurMin?: number;
  rpe?: number;
  plezier?: number;
  notitie?: string;
}

/** Zet de lopende sessie om naar een gelogde sessie: alleen afgewerkte sets tellen. */
export function naarSessie(s: ActiveSession, a: Afsluiting): Sessie {
  const oefeningen: Sessie['oefeningen'] = [];
  s.groepen.forEach((g, gi) => {
    const label = g.label ?? String(gi + 1);
    for (const item of g.items) {
      const sets = item.sets.filter((x) => x.klaar).map(({ klaar: _klaar, ...set }) => set);
      if (sets.length === 0) continue;
      oefeningen.push({
        oefeningId: item.oefeningId,
        groep: label,
        groepType: g.type,
        volgorde: oefeningen.length,
        notitie: item.notitie,
        sets,
      });
    }
  });
  return schoon({
    id: s.id,
    soort: 'kracht',
    start: s.start,
    einde: a.einde,
    duurMin: a.duurMin,
    rpe: a.rpe,
    plezier: a.plezier,
    notitie: a.notitie?.trim() || undefined,
    sjabloonId: s.sjabloonId,
    planningId: s.planningId,
    oefeningen,
  });
}

/**
 * Maakt een sjabloon van de sessie zoals ze er bij het afsluiten uitziet: alle groepen en oefeningen,
 * ook die zonder gedane sets, met hun voorschrift. Een vervangen oefening valt weg; haar vervanger
 * neemt alleen de structuur over (sets, rust, rol), niet de last of de reps.
 */
export function naarSjabloon(s: ActiveSession, naam: string): Sjabloon {
  const groepen: SjabloonGroep[] = [];
  for (const g of s.groepen) {
    const actief = g.items.filter((item) => !item.vervangen);
    const items: SjabloonItem[] = actief.map((item) => {
      const werk = item.sets.filter((x) => !x.opwarm);
      const reps = werk
        .filter((x) => x.klaar)
        .map((x) => x.reps ?? Math.min(x.repsLinks ?? Infinity, x.repsRechts ?? Infinity))
        .filter((x) => Number.isFinite(x) && x > 0);
      const repBereik =
        item.doel.repBereik ?? (reps.length ? { min: Math.min(...reps), max: Math.max(...reps) } : undefined);
      return schoon({
        oefeningId: item.oefeningId,
        sets: g.type === 'enkel' ? (item.doel.sets ?? Math.max(1, werk.length)) : undefined,
        repBereik,
        doelRIR: item.doel.doelRIR,
        rustSec: item.doel.rustSec,
        rol: item.doel.rol,
        last: item.doel.last,
        notitie: item.doel.notitie,
      });
    });
    if (items.length === 0) continue;
    const rondes =
      g.type === 'superset' || g.type === 'circuit'
        ? Math.max(g.rondes, ...actief.map((it) => it.sets.filter((x) => !x.opwarm).length))
        : g.rondes;
    groepen.push(
      schoon({
        label: g.label,
        type: g.type,
        rondes: Math.max(1, rondes),
        rustTussenRondesSec: g.rustTussenRondesSec,
        rustTussenOefeningenSec: g.rustTussenOefeningenSec,
        duurSec: g.duurSec,
        intervalSec: g.intervalSec,
        notitie: g.notitie,
        items,
      }),
    );
  }
  return { id: nieuwId('sjab'), naam: naam.trim(), opwarming: s.opwarming, groepen };
}

/**
 * Een naam voor een nieuw sjabloon die nog niet bestaat (hoofdletters en leestekens tellen niet):
 * "Sessie A" → "Sessie A (aangepast)" → "Sessie A (aangepast 2)" …
 */
export function vrijeSjabloonNaam(naam: string, bestaande: string[]): string {
  const bezet = new Set(bestaande.map(normaliseer));
  const basis = naam.trim();
  if (!bezet.has(normaliseer(basis))) return basis;
  for (let i = 1; ; i++) {
    const kandidaat = `${basis} (aangepast${i === 1 ? '' : ` ${i}`})`;
    if (!bezet.has(normaliseer(kandidaat))) return kandidaat;
  }
}

/** Haalt velden met de waarde undefined weg (netter in JSON en IndexedDB). */
export function schoon<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

// Logs exporteren: als JSON (soort "logs") en als compacte tekst om in een chat te plakken voor een review.
import { SCHEMA_VERSIE, type Filosofie, type LogSet, type LogsBestand, type Materiaal, type Oefening, type Sessie, type Sjabloon } from '../schema';
import { schoon } from './activeSession';
import { recordsNaarSessie, type Snapshot } from './backup';
import { formatGetal } from './format';
import { huidigeStand, maakVoorstel, voorstelTekst, werkSets, type Gedaan } from './progression';

export interface Periode {
  /** JJJJ-MM-DD, inclusief. */
  van?: string;
  /** JJJJ-MM-DD, inclusief. */
  tot?: string;
}

function inPeriode(start: string, p: Periode): boolean {
  const dag = start.slice(0, 10);
  return (!p.van || dag >= p.van) && (!p.tot || dag <= p.tot);
}

/** De gelogde sessies in de periode, de oudste eerst. */
export function sessiesIn(snap: Pick<Snapshot, 'sessies' | 'entries'>, p: Periode): Sessie[] {
  return snap.sessies
    .filter((s) => inPeriode(s.start, p))
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((s) => schoon(recordsNaarSessie(s, snap.entries)));
}

/** Een logsbestand met de sessies uit de periode en de oefeningen die erin voorkomen. */
export function exporteerLogs(snap: Pick<Snapshot, 'sessies' | 'entries' | 'oefeningen'>, p: Periode, nu: Date = new Date()): LogsBestand {
  const sessies = sessiesIn(snap, p);
  const ids = new Set(sessies.flatMap((s) => s.oefeningen.map((o) => o.oefeningId)));
  return {
    schemaVersie: SCHEMA_VERSIE,
    soort: 'logs',
    gemaaktOp: nu.toISOString(),
    bron: 'Emerge-export',
    oefeningen: snap.oefeningen.filter((o) => ids.has(o.id)),
    sessies,
  };
}

// ---------- Tekst ----------

const KWALITEIT = { makkelijk: 'M', controle: 'C', gevecht: 'G' } as const;

/** Eén set heel kort, bv. "80×8@2", "+5×7@2 C", "24×L10/R9@2", "30s", "L30/R25s", "40m". */
export function compacteSet(s: LogSet): string {
  let last = '';
  if (s.gewichtKg !== undefined && s.gewichtKg > 0) last = formatGetal(s.gewichtKg);
  if (s.extraKg !== undefined && s.extraKg > 0) last += `+${formatGetal(s.extraKg)}`;
  let reps = '';
  if (s.reps !== undefined) reps = String(s.reps);
  else if (s.repsLinks !== undefined || s.repsRechts !== undefined) reps = `L${s.repsLinks ?? '–'}/R${s.repsRechts ?? '–'}`;
  let uit = last && reps ? `${last}×${reps}` : last || reps;
  if (s.duurSec) uit += `${uit ? ' ' : ''}${formatGetal(s.duurSec)}s`;
  else if (s.duurSecLinks || s.duurSecRechts) uit += `${uit ? ' ' : ''}L${formatGetal(s.duurSecLinks ?? 0)}/R${formatGetal(s.duurSecRechts ?? 0)}s`;
  if (s.afstandM) uit += `${uit ? ' ' : ''}${formatGetal(s.afstandM)}m`;
  else if (s.afstandMLinks || s.afstandMRechts) uit += `${uit ? ' ' : ''}L${formatGetal(s.afstandMLinks ?? 0)}/R${formatGetal(s.afstandMRechts ?? 0)}m`;
  if (s.tempo) uit += ` (${s.tempo})`;
  if (s.rir !== undefined) uit += `@${formatGetal(s.rir)}`;
  else if (s.rirLinks !== undefined || s.rirRechts !== undefined) uit += `@L${s.rirLinks ?? '–'}/R${s.rirRechts ?? '–'}`;
  if (s.kwaliteit) uit += ` ${KWALITEIT[s.kwaliteit]}`;
  if (s.ronde !== undefined) uit = `r${s.ronde}:${uit}`;
  if (s.opwarm) uit = `(o)${uit}`;
  if (s.notitie) uit += ` "${s.notitie}"`;
  return uit || '—';
}

function setsTekst(sets: LogSet[]): string {
  // Staat er overal dezelfde trede of variant, dan één keer vooraan.
  const labels = new Set(sets.filter((s) => !s.opwarm).map((s) => s.trede ?? s.variant ?? ''));
  const gedeeld = labels.size === 1 ? [...labels][0] : '';
  const delen = sets.map((s) => {
    const label = s.trede ?? s.variant;
    const voor = !gedeeld && label && !s.opwarm ? `${label} ` : '';
    return voor + compacteSet(s);
  });
  return `${gedeeld ? `[${gedeeld}] ` : ''}${delen.join(', ')}`;
}

function bereik(b: { min: number; max: number } | undefined, eenheid = ''): string {
  if (!b) return '';
  return b.min === b.max ? `${b.min}${eenheid}` : `${b.min}–${b.max}${eenheid}`;
}

export interface TekstInput {
  snap: Pick<Snapshot, 'sessies' | 'entries' | 'oefeningen'> & { sjablonen?: Sjabloon[]; materiaal?: Materiaal[] };
  filosofie: Filosofie;
  periode: Periode;
}

/** Compacte tekstsamenvatting, om in een Claude-chat te plakken voor een review. */
export function tekstSamenvatting({ snap, filosofie, periode }: TekstInput): string {
  const sessies = sessiesIn(snap, periode);
  const oef = new Map(snap.oefeningen.map((o) => [o.id, o]));
  const sjabNaam = new Map((snap.sjablonen ?? []).map((s) => [s.id, s.naam]));
  const regels: string[] = [];
  const van = periode.van ?? sessies[0]?.start.slice(0, 10) ?? '…';
  const tot = periode.tot ?? sessies.at(-1)?.start.slice(0, 10) ?? '…';

  regels.push(`Emerge-trainingslog ${van} – ${tot} (${sessies.length} ${sessies.length === 1 ? 'sessie' : 'sessies'})`);
  regels.push('Notatie: kg×reps@RIR · +kg = extra last (vest) · L/R = links/rechts · (o) = opwarmset · r1 = ronde · M/C/G = Makkelijk/Controle/Gevecht');
  regels.push('');

  for (const s of sessies) {
    const kop = [
      s.start.slice(0, 16).replace('T', ' '),
      s.sjabloonId ? sjabNaam.get(s.sjabloonId) : undefined,
      s.duurMin !== undefined ? `${s.duurMin} min` : undefined,
      s.rpe !== undefined ? `RPE ${formatGetal(s.rpe)}` : undefined,
      s.plezier !== undefined ? `plezier ${s.plezier}/5` : undefined,
    ].filter(Boolean);
    regels.push(`## ${kop.join(' · ')}`);
    for (const e of s.oefeningen) {
      const naam = oef.get(e.oefeningId)?.naam ?? e.oefeningId;
      const groep = e.groep ? `${e.groep}${e.groepType && e.groepType !== 'enkel' ? ` (${e.groepType})` : ''} ` : '';
      regels.push(`- ${groep}${naam}: ${setsTekst(e.sets)}${e.notitie ? ` — ${e.notitie}` : ''}`);
    }
    if (s.notitie) regels.push(`Notitie: ${s.notitie}`);
    regels.push('');
  }

  // Per oefening: de regel, waar je staat en wat de app voorstelt.
  const gebruikt = [...new Set(sessies.flatMap((s) => s.oefeningen.map((o) => o.oefeningId)))];
  if (gebruikt.length) {
    regels.push('## Per oefening: regel, stand en voorstel van de app');
    const alleSessies = sessiesIn(snap, {});
    for (const id of gebruikt) {
      const o = oef.get(id);
      if (!o) continue;
      regels.push(oefeningRegel(o, alleSessies, snap.materiaal ?? [], filosofie));
    }
  }
  return regels.join('\n').trim() + '\n';
}

function oefeningRegel(o: Oefening, sessies: Sessie[], materiaal: Materiaal[], filosofie: Filosofie): string {
  const historiek: Gedaan[] = sessies.flatMap((s) =>
    s.oefeningen.filter((e) => e.oefeningId === o.id).map((e) => ({ start: s.start, sets: e.sets })),
  );
  const p = o.progressie;
  const delen: string[] = [];
  if (p) {
    const stand = huidigeStand(o, historiek);
    const r = [
      p.profiel,
      p.modus === 'ladder' ? `ladder ${p.treden.map((t) => (t.label === stand.trede?.label ? `*${t.label}*` : t.label)).join(' → ')}` : 'last',
      p.repBereik ? `${bereik(p.repBereik)} reps` : '',
      p.duurBereikSec ? bereik(p.duurBereikSec, 's') : '',
      p.afstandBereikM ? bereik(p.afstandBereikM, 'm') : '',
      p.doelRIR !== undefined ? `RIR ${formatGetal(p.doelRIR)}` : '',
      p.sets ? `${p.sets} sets` : '',
    ].filter(Boolean);
    delen.push(r.join(', '));
    const v = maakVoorstel({ oefening: o, materiaal, filosofie }, historiek);
    const vt = voorstelTekst(v);
    delen.push(`voorstel: ${vt ? `${vt} — ` : ''}${v.uitleg}`);
  } else {
    delen.push('geen progressieregel');
  }
  const aantal = historiek.filter((h) => werkSets(h.sets).length > 0).length;
  return `- ${o.naam}${o.unilateraal ? ' (per kant)' : ''} [${aantal}×]: ${delen.join(' · ')}`;
}

/** Bestandsnaam, bv. emerge-logs-2026-10-29.json */
export function logsBestandsnaam(nu: Date = new Date()): string {
  const d = new Date(nu.getTime() - nu.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  return `emerge-logs-${d}.json`;
}

import { z } from 'zod';
import { nl as zodNl } from 'zod/v4/locales';
import { SOORTEN, bestandSchemas, type BackupBestand, type BibliotheekBestand, type LogsBestand, type ProgrammaBestand } from '../schema';
import { migreer } from '../schema/migrate';

z.config(zodNl());

export interface Fout {
  /** Leesbaar pad, bv. oefeningen[3] (Pull-up).progressie.repBereik.max */
  pad: string;
  bericht: string;
}

export type ParseResultaat =
  | { ok: true; soort: 'backup'; bestand: BackupBestand }
  | { ok: true; soort: 'bibliotheek'; bestand: BibliotheekBestand }
  | { ok: true; soort: 'logs'; bestand: LogsBestand }
  | { ok: true; soort: 'programma'; bestand: ProgrammaBestand }
  | { ok: false; fouten: Fout[] };

const MAX_FOUTEN = 50;

/** Leest de tekst van een import- of back-upbestand, valideert die en geeft het bestand of een lijst fouten terug. */
export function parseBestand(tekst: string): ParseResultaat {
  let ruw: unknown;
  try {
    ruw = JSON.parse(tekst);
  } catch (e) {
    return { ok: false, fouten: [{ pad: '(bestand)', bericht: `geen geldige JSON: ${(e as Error).message}` }] };
  }
  return parseObject(ruw);
}

export function parseObject(ruw: unknown): ParseResultaat {
  if (typeof ruw !== 'object' || ruw === null || Array.isArray(ruw)) {
    return { ok: false, fouten: [{ pad: '(bestand)', bericht: 'het bestand moet een JSON-object zijn ({ … })' }] };
  }
  const obj = ruw as Record<string, unknown>;
  const soort = obj.soort;
  if (typeof soort !== 'string' || !(SOORTEN as readonly string[]).includes(soort)) {
    return {
      ok: false,
      fouten: [{ pad: 'soort', bericht: `moet "backup", "bibliotheek", "logs" of "programma" zijn (gevonden: ${JSON.stringify(soort)})` }],
    };
  }
  const gemigreerd = migreer(obj);
  if (!gemigreerd.ok) return { ok: false, fouten: [{ pad: 'schemaVersie', bericht: gemigreerd.bericht }] };

  const schema = bestandSchemas[soort as keyof typeof bestandSchemas];
  const res = schema.safeParse(gemigreerd.bestand);
  if (!res.success) {
    const fouten = res.error.issues.slice(0, MAX_FOUTEN).map((i) => ({
      pad: formatPad(i.path, gemigreerd.bestand),
      bericht: formatBericht(i, gemigreerd.bestand),
    }));
    if (res.error.issues.length > MAX_FOUTEN) {
      fouten.push({ pad: '…', bericht: `en nog ${res.error.issues.length - MAX_FOUTEN} fouten` });
    }
    return { ok: false, fouten };
  }
  return { ok: true, soort, bestand: res.data } as ParseResultaat;
}

/** Zet een Zod-pad om in iets leesbaars; bij lijstelementen met een naam of label komt die erbij. */
export function formatPad(path: readonly PropertyKey[], root: unknown): string {
  if (path.length === 0) return '(bestand)';
  let out = '';
  let node: unknown = root;
  for (const key of path) {
    if (typeof key === 'number') {
      out += `[${key}]`;
      node = Array.isArray(node) ? node[key] : undefined;
      const naam = naamVan(node);
      if (naam) out += ` (${naam})`;
    } else {
      out += (out ? '.' : '') + String(key);
      node = node && typeof node === 'object' ? (node as Record<string, unknown>)[key as string] : undefined;
    }
  }
  return out;
}

function naamVan(node: unknown): string | undefined {
  if (!node || typeof node !== 'object') return undefined;
  const o = node as Record<string, unknown>;
  for (const k of ['naam', 'label', 'oefeningId', 'id']) {
    if (typeof o[k] === 'string' && o[k]) return o[k] as string;
  }
  return undefined;
}

const kort = (t: string) => (t.length > 40 ? `${t.slice(0, 40)}…` : t);

const VERWACHT: Record<string, string> = {
  number: 'een getal (zonder aanhalingstekens)',
  int: 'een geheel getal',
  string: 'tekst tussen aanhalingstekens',
  boolean: 'true of false',
  array: 'een lijst [ … ]',
  object: 'een object { … }',
};

function waardeOp(path: readonly PropertyKey[], root: unknown): unknown {
  let node = root;
  for (const key of path) {
    if (!node || typeof node !== 'object') return undefined;
    node = (node as Record<PropertyKey, unknown>)[key];
  }
  return node;
}

function formatBericht(issue: z.core.$ZodIssue, root: unknown): string {
  if (issue.code === 'invalid_type') {
    const waarde = waardeOp(issue.path, root);
    if (waarde === undefined) return 'ontbreekt (verplicht veld)';
    const verwacht = VERWACHT[issue.expected];
    if (verwacht) return `verwacht ${verwacht}, maar kreeg ${kort(JSON.stringify(waarde))}`;
  }
  if (issue.code === 'unrecognized_keys') {
    const keys = issue.keys.map((k) => `"${k}"`).join(', ');
    return `onbekend veld ${keys} (tikfout? zie docs/schema.md)`;
  }
  return issue.message;
}

/** Valideert één object (bv. een oefening uit een formulier) en geeft de fouten in dezelfde vorm. */
export function valideer<T>(schema: z.ZodType<T>, data: unknown): { ok: true; data: T } | { ok: false; fouten: Fout[] } {
  const res = schema.safeParse(data);
  if (res.success) return { ok: true, data: res.data };
  return {
    ok: false,
    fouten: res.error.issues.map((i) => ({ pad: formatPad(i.path, data), bericht: formatBericht(i, data) })),
  };
}

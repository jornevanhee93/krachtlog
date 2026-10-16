// Omzetten tussen de inhoud van de database en een back-upbestand.
import type { EntryRecord, SessieRecord } from '../db/db';
import {
  SCHEMA_VERSIE,
  type BackupBestand,
  type Instellingen,
  type Materiaal,
  type Oefening,
  type PlanStatus,
  type Programma,
  type Sessie,
  type Sjabloon,
} from '../schema';
import { schoon } from './activeSession';

/** Alles wat in de database staat (behalve de lopende sessie). */
export interface Snapshot {
  instellingen: Instellingen;
  materiaal: Materiaal[];
  oefeningen: Oefening[];
  sjablonen: Sjabloon[];
  sessies: SessieRecord[];
  entries: EntryRecord[];
  programmas: Programma[];
  planning: PlanStatus[];
}

/** Een sessie met haar oefeningen omzetten naar records voor de tabellen sessies en entries. */
export function sessieNaarRecords(sessie: Sessie): { sessie: SessieRecord; entries: EntryRecord[] } {
  const { oefeningen, ...rest } = sessie;
  return {
    sessie: rest,
    entries: oefeningen.map((o) => ({ ...o, id: `${sessie.id}#${o.volgorde}`, sessieId: sessie.id, start: sessie.start })),
  };
}

/** Records terug samenvoegen tot een sessie. */
export function recordsNaarSessie(sessie: SessieRecord, entries: EntryRecord[]): Sessie {
  return {
    ...sessie,
    oefeningen: entries
      .filter((e) => e.sessieId === sessie.id)
      .sort((a, b) => a.volgorde - b.volgorde)
      .map(({ id: _id, sessieId: _s, start: _start, ...o }) => o),
  };
}

export function maakBackup(snap: Snapshot, nu: Date = new Date()): BackupBestand {
  const perSessie = new Map<string, EntryRecord[]>();
  for (const e of snap.entries) {
    const lijst = perSessie.get(e.sessieId) ?? [];
    lijst.push(e);
    perSessie.set(e.sessieId, lijst);
  }
  return {
    schemaVersie: SCHEMA_VERSIE,
    soort: 'backup',
    gemaaktOp: nu.toISOString(),
    instellingen: snap.instellingen,
    materiaal: snap.materiaal,
    oefeningen: snap.oefeningen,
    sjablonen: snap.sjablonen,
    sessies: [...snap.sessies]
      .sort((a, b) => a.start.localeCompare(b.start))
      .map((s) => schoon(recordsNaarSessie(s, perSessie.get(s.id) ?? []))),
    programmas: snap.programmas,
    planning: snap.planning,
  };
}

export function backupNaarSnapshot(b: BackupBestand): Snapshot {
  const sessies: SessieRecord[] = [];
  const entries: EntryRecord[] = [];
  for (const s of b.sessies) {
    const r = sessieNaarRecords(s);
    sessies.push(r.sessie);
    entries.push(...r.entries);
  }
  return {
    instellingen: b.instellingen,
    materiaal: b.materiaal,
    oefeningen: b.oefeningen,
    sjablonen: b.sjablonen,
    sessies,
    entries,
    programmas: b.programmas,
    planning: b.planning,
  };
}

/** Bestandsnaam voor een back-up, bv. emerge-backup-2026-10-29.json */
export function backupBestandsnaam(nu: Date = new Date()): string {
  const d = new Date(nu.getTime() - nu.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  return `emerge-backup-${d}.json`;
}

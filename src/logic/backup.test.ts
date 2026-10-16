import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { KrachtlogDb } from '../db/db';
import { bewaarSessie, leesSnapshot, vervangAlles, vorigeSets } from '../db/repo';
import type { BackupBestand } from '../schema';
import { backupBestandsnaam, backupNaarSnapshot, maakBackup } from './backup';
import { parseBestand } from './parseFile';

const tekst = readFileSync(new URL('../../docs/voorbeelden/backup.json', import.meta.url), 'utf8');

function parseBackup(t: string): BackupBestand {
  const res = parseBestand(t);
  if (!res.ok || res.soort !== 'backup') throw new Error(JSON.stringify(res));
  return res.bestand;
}

const byId = <T extends { id: string }>(a: T[]) => [...a].sort((x, y) => x.id.localeCompare(y.id));
const zonderTijd = ({ gemaaktOp: _g, bron: _b, ...rest }: BackupBestand) => ({
  ...rest,
  materiaal: byId(rest.materiaal),
  oefeningen: byId(rest.oefeningen),
  sjablonen: byId(rest.sjablonen),
  sessies: byId(rest.sessies),
});

let teller = 0;
let db: KrachtlogDb;
afterEach(async () => {
  await db?.delete();
});
const nieuweDb = () => (db = new KrachtlogDb(`test-${++teller}`));

describe('back-up → herstel (round-trip)', () => {
  it('geeft na herstel exact dezelfde back-up terug', async () => {
    nieuweDb();
    const origineel = parseBackup(tekst);
    await vervangAlles(backupNaarSnapshot(origineel), db);
    const opnieuw = maakBackup(await leesSnapshot(db), new Date('2026-10-20T10:00:00Z'));
    // Via tekst, zoals een echt bestand
    const terug = parseBackup(JSON.stringify(opnieuw));
    expect(zonderTijd(terug)).toEqual(zonderTijd(origineel));
    expect(terug.gemaaktOp).toBe('2026-10-20T10:00:00.000Z');
  });

  it('herstel vervangt wat er stond', async () => {
    nieuweDb();
    await bewaarSessie({ id: 'oud', soort: 'kracht', start: '2026-01-01', oefeningen: [] }, db);
    await vervangAlles(backupNaarSnapshot(parseBackup(tekst)), db);
    const snap = await leesSnapshot(db);
    expect(snap.sessies.map((s) => s.id)).toEqual(['ses-2026-09-03']);
  });

  it('vindt de sets van de laatste keer per oefening', async () => {
    nieuweDb();
    const set = (reps: number) => ({ opwarm: false, reps });
    await bewaarSessie({ id: 'a', soort: 'kracht', start: '2026-09-01T18:00', oefeningen: [{ oefeningId: 'x', volgorde: 0, sets: [set(5)] }] }, db);
    await bewaarSessie({ id: 'b', soort: 'kracht', start: '2026-09-08T18:00', oefeningen: [{ oefeningId: 'x', volgorde: 0, sets: [set(7)] }] }, db);
    await bewaarSessie({ id: 'c', soort: 'kracht', start: '2026-09-04T18:00', oefeningen: [{ oefeningId: 'x', volgorde: 0, sets: [set(6)] }] }, db);
    expect(await vorigeSets(['x', 'y'], db)).toEqual({ x: [set(7)] });
  });
});

describe('backupBestandsnaam', () => {
  it('bevat de datum', () => {
    expect(backupBestandsnaam(new Date(2026, 9, 29, 12))).toBe('krachtlog-backup-2026-10-29.json');
  });
});

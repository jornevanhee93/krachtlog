// Lezen en schrijven in de database. Geen domeinlogica: die zit in src/logic/.
import { instellingen as instellingenSchema, type Instellingen, type LogSet, type Sessie } from '../schema';
import type { ActiveSession } from '../logic/activeSession';
import { sessieNaarRecords, type Snapshot } from '../logic/backup';
import type { ImportResultaat } from '../logic/importPlan';
import { db as standaardDb, type KrachtlogDb } from './db';

export async function leesInstellingen(db: KrachtlogDb = standaardDb): Promise<Instellingen> {
  const rec = await db.instellingen.get('instellingen');
  return rec?.value ?? instellingenSchema.parse({});
}

export async function bewaarInstellingen(waarde: Instellingen, db: KrachtlogDb = standaardDb) {
  await db.instellingen.put({ key: 'instellingen', value: waarde });
}

export async function zetLaatsteBackup(datum: Date, db: KrachtlogDb = standaardDb) {
  const inst = await leesInstellingen(db);
  await bewaarInstellingen({ ...inst, laatsteBackup: datum.toISOString() }, db);
}

export async function leesSnapshot(db: KrachtlogDb = standaardDb): Promise<Snapshot> {
  return db.transaction('r', [db.instellingen, db.materiaal, db.oefeningen, db.sjablonen, db.sessies, db.entries], async () => ({
    instellingen: await leesInstellingen(db),
    materiaal: await db.materiaal.toArray(),
    oefeningen: await db.oefeningen.toArray(),
    sjablonen: await db.sjablonen.toArray(),
    sessies: await db.sessies.toArray(),
    entries: await db.entries.toArray(),
  }));
}

/** Vervangt alles in de database door de snapshot (herstel van een back-up). De lopende sessie blijft staan. */
export async function vervangAlles(snap: Snapshot, db: KrachtlogDb = standaardDb) {
  await db.transaction('rw', [db.instellingen, db.materiaal, db.oefeningen, db.sjablonen, db.sessies, db.entries], async () => {
    await Promise.all([
      db.instellingen.clear(),
      db.materiaal.clear(),
      db.oefeningen.clear(),
      db.sjablonen.clear(),
      db.sessies.clear(),
      db.entries.clear(),
    ]);
    await db.instellingen.put({ key: 'instellingen', value: snap.instellingen });
    await db.materiaal.bulkPut(snap.materiaal);
    await db.oefeningen.bulkPut(snap.oefeningen);
    await db.sjablonen.bulkPut(snap.sjablonen);
    await db.sessies.bulkPut(snap.sessies);
    await db.entries.bulkPut(snap.entries);
  });
}

/** Wist alles op dit toestel, ook de lopende sessie en de instellingen. */
export async function wisAlles(db: KrachtlogDb = standaardDb) {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });
}

export async function bewaarSessie(sessie: Sessie, db: KrachtlogDb = standaardDb) {
  const r = sessieNaarRecords(sessie);
  await db.transaction('rw', [db.sessies, db.entries], async () => {
    await db.entries.where('sessieId').equals(sessie.id).delete();
    await db.sessies.put(r.sessie);
    await db.entries.bulkPut(r.entries);
  });
}

export async function verwijderSessie(id: string, db: KrachtlogDb = standaardDb) {
  await db.transaction('rw', [db.sessies, db.entries], async () => {
    await db.entries.where('sessieId').equals(id).delete();
    await db.sessies.delete(id);
  });
}

/** De sets van de laatste keer dat elke oefening gedaan werd. */
export async function vorigeSets(oefeningIds: string[], db: KrachtlogDb = standaardDb): Promise<Record<string, LogSet[]>> {
  const uit: Record<string, LogSet[]> = {};
  for (const id of new Set(oefeningIds)) {
    const laatste = await db.entries
      .where('[oefeningId+start]')
      .between([id, ''], [id, '￿'])
      .last();
    if (laatste) uit[id] = laatste.sets;
  }
  return uit;
}

export async function pasImportToe(res: ImportResultaat, db: KrachtlogDb = standaardDb) {
  await db.transaction('rw', [db.materiaal, db.oefeningen, db.sjablonen, db.sessies, db.entries], async () => {
    await db.materiaal.bulkPut(res.materiaal);
    await db.oefeningen.bulkPut(res.oefeningen);
    await db.sjablonen.bulkPut(res.sjablonen);
    for (const s of res.sessies) {
      const r = sessieNaarRecords(s);
      await db.sessies.put(r.sessie);
      await db.entries.bulkPut(r.entries);
    }
  });
}

export async function leesActief(db: KrachtlogDb = standaardDb): Promise<ActiveSession | undefined> {
  return (await db.actief.get('actief'))?.value;
}

export async function bewaarActief(s: ActiveSession, db: KrachtlogDb = standaardDb) {
  await db.actief.put({ key: 'actief', value: s });
}

export async function wisActief(db: KrachtlogDb = standaardDb) {
  await db.actief.delete('actief');
}

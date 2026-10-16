import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { alleEntries, leesInstellingen } from '../db/repo';
import { huidigeStand, maakVoorstel, type Gedaan, type Stand, type Voorstel } from '../logic/progression';

export interface ProgressieInfo {
  voorstel: Voorstel;
  stand: Stand;
  historiek: Gedaan[];
}

/**
 * Het voorstel en de historiek per oefening, live uit de database.
 * Optioneel zonder een bepaalde sessie (de lopende sessie telt niet mee).
 */
export function useProgressie(oefeningIds: string[], zonderSessie?: string): Map<string, ProgressieInfo> | undefined {
  const sleutel = [...new Set(oefeningIds)].sort().join('|');
  return useLiveQuery(async () => {
    const ids = sleutel ? sleutel.split('|') : [];
    const [oefeningen, materiaal, inst] = await Promise.all([
      db.oefeningen.bulkGet(ids),
      db.materiaal.toArray(),
      leesInstellingen(),
    ]);
    const uit = new Map<string, ProgressieInfo>();
    for (let i = 0; i < ids.length; i++) {
      const oef = oefeningen[i];
      if (!oef) continue;
      const historiek = (await alleEntries(ids[i])).filter((e) => e.sessieId !== zonderSessie);
      uit.set(ids[i], {
        voorstel: maakVoorstel({ oefening: oef, materiaal, filosofie: inst.filosofie }, historiek),
        stand: huidigeStand(oef, historiek),
        historiek,
      });
    }
    return uit;
  }, [sleutel, zonderSessie]);
}

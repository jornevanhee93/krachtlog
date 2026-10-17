import Dexie, { type EntityTable } from 'dexie';
import type { Instellingen, LogSet, Materiaal, Oefening, PlanStatus, Programma, Sessie, SessieOefening, Sjabloon } from '../schema';
import type { ActiveSession } from '../logic/activeSession';

/** Een sessie zonder de oefeningen; die staan apart in "entries". */
export type SessieRecord = Omit<Sessie, 'oefeningen'>;

/** Eén oefening binnen een sessie. Geïndexeerd op oefeningId (+ start) voor snelle historiek per oefening. */
export interface EntryRecord extends Omit<SessieOefening, 'sets'> {
  id: string;
  sessieId: string;
  /** Kopie van de sessiestart, zodat we per oefening op datum kunnen sorteren. */
  start: string;
  sets: LogSet[];
}

export interface SettingRecord {
  key: 'instellingen';
  value: Instellingen;
}

export interface ActiveRecord {
  key: 'actief';
  value: ActiveSession;
}

export class KrachtlogDb extends Dexie {
  materiaal!: EntityTable<Materiaal, 'id'>;
  oefeningen!: EntityTable<Oefening, 'id'>;
  sjablonen!: EntityTable<Sjabloon, 'id'>;
  sessies!: EntityTable<SessieRecord, 'id'>;
  entries!: EntityTable<EntryRecord, 'id'>;
  instellingen!: EntityTable<SettingRecord, 'key'>;
  actief!: EntityTable<ActiveRecord, 'key'>;
  programmas!: EntityTable<Programma, 'id'>;
  planning!: EntityTable<PlanStatus, 'id'>;

  constructor(name = 'krachtlog') {
    super(name);
    this.version(1).stores({
      materiaal: '&id, naam',
      oefeningen: '&id, naam, *patronen',
      sjablonen: '&id, naam',
      sessies: '&id, start, soort, sjabloonId',
      entries: '&id, sessieId, oefeningId, [oefeningId+start]',
      instellingen: '&key',
      actief: '&key',
    });
    // Versie 2: programma's en de toestand van geplande sessies. De bestaande tabellen blijven ongewijzigd.
    this.version(2).stores({
      programmas: '&id, naam',
      planning: '&id, programmaId, datum',
    });
    // Versie 3 (schema v4): sets kunnen duur en afstand per kant hebben. Geen nieuwe indexen;
    // bestaande sets blijven ongewijzigd geldig, dus de upgrade verandert niets aan de gegevens.
    this.version(3)
      .stores({})
      .upgrade(() => {});
  }
}

export const db = new KrachtlogDb();

import { SCHEMA_VERSIE } from './files';

/**
 * Migraties van oudere schemaversies naar de huidige.
 * migraties[n] zet een bestand van versie n om naar versie n + 1.
 * Een migratie verandert alleen wat nodig is; alle bestaande gegevens blijven behouden.
 */
const migraties: Record<number, (bestand: Record<string, unknown>) => Record<string, unknown>> = {
  // 1 → 2: oefeningen kregen een optioneel veld "icoon". Een v1-bestand is dus al geldig in v2.
  1: (b) => b,
  // 2 → 3: programma's (nieuwe soort "programma"; in een back-up "programmas" en "planning", standaard leeg)
  // en een optioneel "planningId" bij sessies. Een v2-bestand is dus al geldig in v3.
  2: (b) => b,
};

export type MigratieResultaat =
  | { ok: true; bestand: Record<string, unknown> }
  | { ok: false; bericht: string };

export function migreer(bestand: Record<string, unknown>): MigratieResultaat {
  let versie = bestand.schemaVersie;
  if (typeof versie !== 'number' || !Number.isInteger(versie) || versie < 1) {
    return { ok: false, bericht: 'schemaVersie ontbreekt of is geen geheel getal (verwacht bv. "schemaVersie": 1)' };
  }
  if (versie > SCHEMA_VERSIE) {
    return {
      ok: false,
      bericht: `dit bestand heeft schemaVersie ${versie}, maar deze app kent maar tot versie ${SCHEMA_VERSIE}. Werk de app bij en probeer opnieuw.`,
    };
  }
  let huidig = bestand;
  while (versie < SCHEMA_VERSIE) {
    const stap = migraties[versie];
    if (!stap) return { ok: false, bericht: `geen migratie van schemaVersie ${versie} naar ${versie + 1}` };
    huidig = stap(huidig);
    versie += 1;
  }
  return { ok: true, bestand: { ...huidig, schemaVersie: SCHEMA_VERSIE } };
}

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseObject } from '../logic/parseFile';
import { SCHEMA_VERSIE } from './files';
import { migreer } from './migrate';

function voorbeeld(naam: string) {
  return JSON.parse(readFileSync(new URL(`../../docs/voorbeelden/${naam}`, import.meta.url), 'utf8')) as Record<string, unknown>;
}

describe('migratie van oudere bestanden', () => {
  for (const naam of ['bibliotheek.json', 'logs.json', 'backup.json']) {
    it(`een v1-${naam} blijft importeerbaar en verliest niets`, () => {
      const v2 = voorbeeld(naam);
      const v1 = { ...v2, schemaVersie: 1 };
      const res1 = parseObject(v1);
      const res2 = parseObject(v2);
      expect(res1.ok).toBe(true);
      expect(res2.ok).toBe(true);
      if (res1.ok && res2.ok) expect(res1.bestand).toEqual(res2.bestand);
    });
  }

  it('zet de versie op de huidige', () => {
    const r = migreer({ schemaVersie: 1, soort: 'logs' });
    expect(r.ok && r.bestand.schemaVersie).toBe(SCHEMA_VERSIE);
  });

  it('accepteert een geldig icoon en weigert een onbekend', () => {
    const basis = { schemaVersie: SCHEMA_VERSIE, soort: 'bibliotheek' };
    expect(parseObject({ ...basis, oefeningen: [{ id: 'a', naam: 'A', icoon: 'macebell' }] }).ok).toBe(true);
    const fout = parseObject({ ...basis, oefeningen: [{ id: 'a', naam: 'A', icoon: 'fiets' }] });
    expect(fout.ok).toBe(false);
  });
});

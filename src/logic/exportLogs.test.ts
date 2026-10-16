import { describe, expect, it } from 'vitest';
import { filosofie as filosofieSchema, logsBestand, oefening } from '../schema';
import { sessieNaarRecords } from './backup';
import { compacteSet, exporteerLogs, logsBestandsnaam, tekstSamenvatting } from './exportLogs';
import { parseObject } from './parseFile';

// Verzonnen data.
const oefeningen = [
  oefening.parse({
    id: 'pu',
    naam: 'Pull-up',
    metingen: ['extraLast', 'reps'],
    progressie: {
      modus: 'ladder',
      profiel: 'anker',
      repBereik: { min: 5, max: 8 },
      doelRIR: 2,
      sets: 2,
      treden: [{ label: 'BW' }, { label: 'Vest 5', last: { extraKg: 5 } }],
    },
  }),
  oefening.parse({ id: 'rdl', naam: 'SL RDL', unilateraal: true }),
  oefening.parse({ id: 'ongebruikt', naam: 'Ongebruikt' }),
];
const sessies = [
  {
    id: 's1',
    soort: 'kracht' as const,
    start: '2026-09-03T18:30',
    duurMin: 50,
    rpe: 7,
    plezier: 4,
    notitie: 'Goede dag',
    oefeningen: [
      {
        oefeningId: 'pu',
        volgorde: 0,
        groep: 'A',
        groepType: 'superset' as const,
        sets: [
          { opwarm: true, reps: 3 },
          { opwarm: false, trede: 'BW', reps: 8, rir: 2, kwaliteit: 'controle' as const },
          { opwarm: false, trede: 'BW', reps: 8, rir: 2 },
        ],
      },
      { oefeningId: 'rdl', volgorde: 1, sets: [{ opwarm: false, gewichtKg: 24, repsLinks: 10, repsRechts: 9, rir: 2 }] },
    ],
  },
  { id: 's2', soort: 'kracht' as const, start: '2026-10-10', oefeningen: [{ oefeningId: 'rdl', volgorde: 0, sets: [{ opwarm: false, gewichtKg: 28, repsLinks: 8, repsRechts: 8 }] }] },
];
const records = sessies.map(sessieNaarRecords);
const snap = { oefeningen, sessies: records.map((r) => r.sessie), entries: records.flatMap((r) => r.entries) };
const filosofie = filosofieSchema.parse({});

describe('logs exporteren', () => {
  it('alles: geldig logsbestand met alleen de gebruikte oefeningen', () => {
    const b = exporteerLogs(snap, {}, new Date('2026-10-16T20:00:00Z'));
    expect(b.sessies.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(b.oefeningen.map((o) => o.id)).toEqual(['pu', 'rdl']);
    expect(logsBestand.safeParse(b).success).toBe(true);
    // En opnieuw te importeren via dezelfde weg als een bestand.
    expect(parseObject(JSON.parse(JSON.stringify(b))).ok).toBe(true);
  });

  it('een periode (grenzen inbegrepen)', () => {
    expect(exporteerLogs(snap, { van: '2026-10-01' }).sessies.map((s) => s.id)).toEqual(['s2']);
    expect(exporteerLogs(snap, { van: '2026-09-03', tot: '2026-09-03' }).sessies.map((s) => s.id)).toEqual(['s1']);
    expect(exporteerLogs(snap, { van: '2026-11-01' }).oefeningen).toEqual([]);
  });

  it('bestandsnaam valt onder .gitignore (emerge-*.json)', () => {
    expect(logsBestandsnaam(new Date(2026, 9, 29))).toBe('emerge-logs-2026-10-29.json');
  });
});

describe('tekstsamenvatting', () => {
  it('compacte sets', () => {
    expect(compacteSet({ opwarm: false, gewichtKg: 80, reps: 8, rir: 2 })).toBe('80×8@2');
    expect(compacteSet({ opwarm: false, extraKg: 5, reps: 7, rir: 2, kwaliteit: 'gevecht' })).toBe('+5×7@2 G');
    expect(compacteSet({ opwarm: false, gewichtKg: 24, repsLinks: 10, repsRechts: 9, rirLinks: 2, rirRechts: 1 })).toBe('24×L10/R9@L2/R1');
    expect(compacteSet({ opwarm: true, gewichtKg: 40, reps: 5 })).toBe('(o)40×5');
    expect(compacteSet({ opwarm: false, duurSec: 30, ronde: 2 })).toBe('r2:30s');
    expect(compacteSet({ opwarm: false, gewichtKg: 2.5, reps: 1 })).toBe('2,5×1');
  });

  it('per sessie en per oefening, met het voorstel', () => {
    const t = tekstSamenvatting({ snap, filosofie, periode: {} });
    expect(t).toContain('Emerge-trainingslog 2026-09-03 – 2026-10-10 (2 sessies)');
    expect(t).toContain('## 2026-09-03 18:30 · 50 min · RPE 7 · plezier 4/5');
    expect(t).toContain('- A (superset) Pull-up: [BW] (o)3, 8@2 C, 8@2');
    expect(t).toContain('- SL RDL: 24×L10/R9@2');
    expect(t).toContain('Notitie: Goede dag');
    expect(t).toMatch(/- Pull-up \[1×\]: anker, ladder \*BW\* → Vest 5, 5–8 reps, RIR 2, 2 sets · voorstel: Vest 5/);
    expect(t).toContain('- SL RDL (per kant) [2×]: geen progressieregel');
    expect(t).not.toContain('Ongebruikt');
  });

  it('lege periode', () => {
    expect(tekstSamenvatting({ snap, filosofie, periode: { van: '2027-01-01' } })).toContain('(0 sessies)');
  });
});

import { describe, expect, it } from 'vitest';
import { epley, punten, repsPerVariant, setLast } from './charts';

describe('grafiekdata', () => {
  it('Epley alleen bij last en 1–12 reps', () => {
    expect(epley(100, 5)).toBe(116.7);
    expect(epley(100, 1)).toBe(100);
    expect(epley(100, 13)).toBeUndefined();
    expect(epley(undefined, 5)).toBeUndefined();
    expect(epley(0, 5)).toBeUndefined();
  });

  it('last van een set, met lichaamsgewicht bij extra last', () => {
    expect(setLast({ opwarm: false, gewichtKg: 80 })).toBe(80);
    expect(setLast({ opwarm: false, extraKg: 10 })).toBe(10);
    expect(setLast({ opwarm: false, extraKg: 10 }, 75)).toBe(85);
    expect(setLast({ opwarm: false })).toBeUndefined();
  });

  it('topset, volume en e1RM per keer; opwarmsets tellen niet', () => {
    const p = punten([
      {
        start: '2026-09-01T18:00',
        sets: [
          { opwarm: true, gewichtKg: 60, reps: 5 },
          { opwarm: false, gewichtKg: 80, reps: 8 },
          { opwarm: false, gewichtKg: 85, reps: 6 },
        ],
      },
      { start: '2026-09-04T18:00', sets: [{ opwarm: true, gewichtKg: 40, reps: 5 }] },
    ]);
    expect(p).toHaveLength(1);
    expect(p[0]).toMatchObject({ datum: '2026-09-01', topset: 85, volume: 80 * 8 + 85 * 6 });
    expect(p[0].e1rm).toBe(102);
  });

  it('per kant: beide kanten tellen voor het volume, de zwakke kant voor de e1RM', () => {
    const p = punten([{ start: '2026-09-01', sets: [{ opwarm: false, gewichtKg: 24, repsLinks: 10, repsRechts: 8 }] }]);
    expect(p[0].volume).toBe(24 * 18);
    expect(p[0].e1rm).toBe(epley(24, 8));
  });

  it('zonder last: volume = reps, geen topset of e1RM', () => {
    const p = punten([{ start: '2026-09-01', sets: [{ opwarm: false, reps: 8 }, { opwarm: false, reps: 7 }] }]);
    expect(p[0]).toEqual({ datum: '2026-09-01', topset: undefined, volume: 15, e1rm: undefined });
  });

  it('reps per variant, in de volgorde van de ladder', () => {
    const r = repsPerVariant(
      [
        { start: '2026-09-01', sets: [{ opwarm: false, trede: 'Vest 5', reps: 6 }, { opwarm: false, trede: 'BW', reps: 8 }] },
        { start: '2026-09-04', sets: [{ opwarm: false, trede: 'Vest 5', reps: 7 }, { opwarm: false, trede: 'Vest 5', reps: 7 }] },
      ],
      { progressie: { treden: [{ label: 'BW' }, { label: 'Vest 5' }] } as never },
    );
    expect(r.varianten).toEqual(['BW', 'Vest 5']);
    expect(r.rijen[1]).toEqual({ datum: '2026-09-04', 'Vest 5': 14 });
  });
});

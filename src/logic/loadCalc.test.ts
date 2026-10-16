import { describe, expect, it } from 'vitest';
import { haalbareLasten, kleinsteStap, lastenVoor, lastRond, lichter, volgendeLast } from './loadCalc';

const stang = {
  gewichten: {
    type: 'schijven' as const,
    stangKg: 20,
    schijven: [
      { kg: 20, aantal: 2 },
      { kg: 10, aantal: 2 },
      { kg: 5, aantal: 2 },
      { kg: 2.5, aantal: 2 },
      { kg: 1.25, aantal: 2 },
    ],
  },
};

describe('haalbareLasten', () => {
  it('vaste gewichten, gesorteerd en zonder dubbels', () => {
    expect(haalbareLasten({ gewichten: { type: 'vast', kg: [24, 16, 12, 16] } })).toEqual([12, 16, 24]);
  });

  it('stang met schijven in paren', () => {
    const l = haalbareLasten(stang);
    expect(l[0]).toBe(20);
    expect(l).toContain(22.5);
    expect(l).toContain(80);
    expect(l).toContain(92.5);
    expect(l.at(-1)).toBe(20 + 2 * (20 + 10 + 5 + 2.5 + 1.25));
    expect(l).not.toContain(100);
    expect(l).not.toContain(21.25); // één schijf van 1,25 aan één kant kan niet
  });

  it('een oneven aantal schijven: de laatste telt niet', () => {
    const l = haalbareLasten({ gewichten: { type: 'schijven', stangKg: 10, schijven: [{ kg: 5, aantal: 3 }] } });
    expect(l).toEqual([10, 20]);
  });

  it('instelbaar vest van 0 tot 20 per 2,5', () => {
    expect(haalbareLasten({ gewichten: { type: 'instelbaar', minKg: 0, maxKg: 20, stapKg: 2.5 } })).toEqual([
      0, 2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20,
    ]);
  });

  it('elastieken en materiaal zonder gewichten: geen kg', () => {
    expect(haalbareLasten({ gewichten: { type: 'standen', standen: ['licht'] } })).toEqual([]);
    expect(haalbareLasten({})).toEqual([]);
  });

  it('meerdere stukken materiaal samen', () => {
    const m = [
      { id: 'a', gewichten: { type: 'vast' as const, kg: [16, 24] } },
      { id: 'b', gewichten: { type: 'vast' as const, kg: [20, 28] } },
    ];
    expect(lastenVoor(['a', 'b', 'x'], m)).toEqual([16, 20, 24, 28]);
  });
});

describe('stappen', () => {
  const kb = [12, 16, 20, 24, 28, 32];

  it('kleinste stap', () => {
    expect(kleinsteStap(haalbareLasten(stang))).toBe(2.5);
    expect(kleinsteStap(kb)).toBe(4);
    expect(kleinsteStap([10])).toBeUndefined();
  });

  it('volgende last: de eerste haalbare erboven', () => {
    expect(volgendeLast(80, haalbareLasten(stang))).toBe(82.5);
    expect(volgendeLast(24, kb)).toBe(28);
    expect(volgendeLast(32, kb)).toBeUndefined();
  });

  it('volgende last met een eigen kleinste stap', () => {
    expect(volgendeLast(80, [], 5)).toBe(85);
    expect(volgendeLast(80, haalbareLasten(stang), 5)).toBe(85);
    expect(volgendeLast(24, kb, 2)).toBe(28);
  });

  it('10% lichter, afgerond naar beneden op een haalbare last', () => {
    expect(lichter(100, 10, haalbareLasten(stang))).toBe(90);
    expect(lichter(32, 10, kb)).toBe(28);
    expect(lichter(12, 10, kb)).toBe(12); // lichter kan niet
    expect(lichter(83, 10, [], 2.5)).toBe(72.5);
    expect(lastRond(5, kb)).toBe(12);
  });
});

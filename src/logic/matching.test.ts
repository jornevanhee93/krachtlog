import { describe, expect, it } from 'vitest';
import { gelijkenis, normaliseer, zoekMatch } from './matching';

describe('normaliseer', () => {
  it('maakt namen vergelijkbaar', () => {
    expect(normaliseer('  SL-RDL ')).toBe('sl rdl');
    expect(normaliseer('Pull-up (vest)')).toBe('pull up vest');
    expect(normaliseer('Bulgaarse split squat – één been')).toBe('bulgaarse split squat een been');
  });
});

describe('zoekMatch', () => {
  const bestaand = [
    { id: 'pu', naam: 'Pull-up', aliassen: ['Optrekken'] },
    { id: 'rdl', naam: 'Single-leg RDL', aliassen: ['SL RDL'] },
    { id: 'bhs', naam: 'Bear hug squat', aliassen: [] },
  ];

  it('koppelt exact op naam, ongeacht hoofdletters en leestekens', () => {
    expect(zoekMatch({ id: 'x', naam: 'pull up' }, bestaand)).toEqual({ type: 'exact', id: 'pu' });
  });

  it('koppelt exact op alias (in beide richtingen)', () => {
    expect(zoekMatch({ id: 'x', naam: 'SL-RDL' }, bestaand)).toEqual({ type: 'exact', id: 'rdl' });
    expect(zoekMatch({ id: 'x', naam: 'Iets anders', aliassen: ['optrekken'] }, bestaand)).toEqual({ type: 'exact', id: 'pu' });
  });

  it('twijfelt bij een gelijkaardige naam', () => {
    const m = zoekMatch({ id: 'x', naam: 'Bearhug squat' }, bestaand);
    expect(m.type).toBe('twijfel');
    if (m.type === 'twijfel') expect(m.kandidaten[0].id).toBe('bhs');
    expect(zoekMatch({ id: 'x', naam: 'Pull-ups' }, bestaand).type).toBe('twijfel');
  });

  it('maakt een nieuwe oefening als niets lijkt', () => {
    expect(zoekMatch({ id: 'x', naam: 'Farmer carry' }, bestaand)).toEqual({ type: 'nieuw' });
  });

  it('gelijkenis loopt van 0 tot 1', () => {
    expect(gelijkenis('pull up', 'pull up')).toBe(1);
    expect(gelijkenis('pull up', 'farmer carry')).toBeLessThan(0.6);
  });
});

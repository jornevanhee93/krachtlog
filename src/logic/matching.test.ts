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
    expect(zoekMatch({ id: 'x', naam: 'Optrekken met vest', aliassen: ['pull up'] }, bestaand)).toEqual({ type: 'exact', id: 'pu' });
  });

  it('twijfelt als alleen een alias gelijk is aan een alias (bv. een korte bijnaam)', () => {
    // De fout uit de handmatige test: "Copenhagen plank" en "Copenhagen dips" deelden de alias "Copenhagen".
    const lijst = [{ id: 'cd', naam: 'Copenhagen dips', aliassen: ['Copenhagen'] }];
    const m = zoekMatch({ id: 'x', naam: 'Copenhagen plank', aliassen: ['Copenhagen'] }, lijst);
    expect(m.type).toBe('twijfel');
    if (m.type === 'twijfel') expect(m.kandidaten[0].id).toBe('cd');
    expect(zoekMatch({ id: 'x', naam: 'Iets anders', aliassen: ['optrekken'] }, bestaand).type).toBe('twijfel');
  });

  it('twijfelt bij een gelijkaardige naam die een alias bevat', () => {
    const lijst = [{ id: 'cd', naam: 'Copenhagen dips', aliassen: ['Copenhagen'] }];
    expect(zoekMatch({ id: 'x', naam: 'Copenhagen plank' }, lijst).type).toBe('twijfel');
  });

  it('twijfelt als de naam exact past bij meer dan één bestaande oefening', () => {
    const lijst = [
      { id: 'a', naam: 'Plank', aliassen: [] },
      { id: 'b', naam: 'Voorarmsteun', aliassen: ['plank'] },
    ];
    const m = zoekMatch({ id: 'x', naam: 'Plank' }, lijst);
    expect(m.type).toBe('twijfel');
    if (m.type === 'twijfel') expect(m.kandidaten.map((k) => k.id).sort()).toEqual(['a', 'b']);
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

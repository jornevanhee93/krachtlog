import { describe, expect, it } from 'vitest';
import { dagenGeleden, formatGetal, formatKlok, minutenTussen, tredeVoegtToe } from './format';

describe('format', () => {
  it('formatKlok', () => {
    expect(formatKlok(90)).toBe('1:30');
    expect(formatKlok(5)).toBe('0:05');
    expect(formatKlok(-3)).toBe('0:00');
  });
  it('formatGetal', () => {
    expect(formatGetal(2.5)).toBe('2,5');
    expect(formatGetal(20)).toBe('20');
  });
  it('dagenGeleden telt kalenderdagen', () => {
    expect(dagenGeleden('2026-10-20T23:50', new Date(2026, 9, 21, 0, 10))).toBe(1);
    expect(dagenGeleden('2026-10-14', new Date(2026, 9, 21, 12))).toBe(7);
  });
  it('minutenTussen', () => {
    expect(minutenTussen('2026-10-29T18:00:00Z', '2026-10-29T19:05:20Z')).toBe(65);
  });
});

describe('tredeVoegtToe', () => {
  it('een label dat alleen de last herhaalt voegt niets toe', () => {
    expect(tredeVoegtToe('28 kg', '28 kg')).toBe(false);
    expect(tredeVoegtToe('28kg', '28 kg')).toBe(false);
    expect(tredeVoegtToe('+5 kg', '+5 kg')).toBe(false);
    expect(tredeVoegtToe('2,5 kg', '2,5 kg')).toBe(false);
  });
  it('"vest" en "BW" tellen niet mee als gewicht en extra last overeenkomen', () => {
    expect(tredeVoegtToe('32 kg + vest 10', '32 kg +10 kg')).toBe(false);
    expect(tredeVoegtToe('Vest 5', '+5 kg')).toBe(false);
    expect(tredeVoegtToe('Vest10', '+10 kg')).toBe(false);
    expect(tredeVoegtToe('BW + vest 10', '+10 kg')).toBe(false);
    expect(tredeVoegtToe('32 kg + vest 10', '32 kg +5 kg')).toBe(true);
    expect(tredeVoegtToe('32 kg + vest 10', '32 kg')).toBe(true);
  });
  it('een label met meer informatie blijft', () => {
    expect(tredeVoegtToe('Vest 10 + 3s excentrisch', '+10 kg')).toBe(true);
    expect(tredeVoegtToe('Lange hefboom', '')).toBe(true);
    expect(tredeVoegtToe('KB 24', '24 kg')).toBe(true);
    expect(tredeVoegtToe('BW', '')).toBe(true);
    expect(tredeVoegtToe('Vest', '')).toBe(true);
    expect(tredeVoegtToe('BW 15', '')).toBe(true);
  });
});

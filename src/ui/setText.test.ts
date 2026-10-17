import { describe, expect, it } from 'vitest';
import { setTekst } from './setText';

describe('setTekst', () => {
  it('toont het tredelabel niet als het alleen de last herhaalt', () => {
    expect(setTekst({ opwarm: false, trede: '24 kg', gewichtKg: 24, reps: 6 })).toBe('24 kg × 6');
  });
  it('toont het tredelabel als het iets toevoegt', () => {
    expect(setTekst({ opwarm: false, trede: 'Vest 5', extraKg: 5, reps: 7 })).toBe('Vest 5 · +5 kg × 7');
  });
  it('tijd per kant', () => {
    expect(setTekst({ opwarm: false, duurSecLinks: 30, duurSecRechts: 25 })).toBe('L30/R25 s');
  });
});

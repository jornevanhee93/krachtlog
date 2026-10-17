import { describe, expect, it } from 'vitest';
import { oefening } from '../schema';
import { setTekst, snelleTekst } from './setText';

describe('setTekst', () => {
  it('toont het tredelabel niet als het alleen de last herhaalt', () => {
    expect(setTekst({ opwarm: false, trede: '24 kg', gewichtKg: 24, reps: 6 })).toBe('24 kg × 6');
  });
  it('toont het tredelabel of de last, niet allebei, als het label de last volledig beschrijft', () => {
    expect(setTekst({ opwarm: false, trede: 'Vest 5', extraKg: 5, reps: 7 })).toBe('+5 kg × 7');
    expect(setTekst({ opwarm: false, trede: '32 kg + vest 10', gewichtKg: 32, extraKg: 10, duurSec: 30 })).toBe('32 kg +10 kg · 30 s');
  });
  it('toont het tredelabel als het iets toevoegt (variant, tempo, hefboom)', () => {
    expect(setTekst({ opwarm: false, trede: 'Vest 10 + 3s excentrisch', extraKg: 10, reps: 4 })).toBe('Vest 10 + 3s excentrisch · +10 kg × 4');
    expect(setTekst({ opwarm: false, trede: 'Lange hefboom', duurSec: 30 })).toBe('Lange hefboom · 30 s');
    expect(setTekst({ opwarm: false, trede: 'BW', reps: 6, rir: 2 })).toBe('BW · 6 · RIR 2');
  });
  it('tijd per kant', () => {
    expect(setTekst({ opwarm: false, duurSecLinks: 30, duurSecRechts: 25 })).toBe('L30/R25 s');
  });
});

describe('snelleTekst', () => {
  const squat = oefening.parse({ id: 'sq', naam: 'Squat', progressie: { modus: 'last', profiel: 'anker', doelRIR: 2 } });
  it('gewicht × reps met de doel-RIR, zonder kwaliteit', () => {
    expect(snelleTekst({ opwarm: false, gewichtKg: 80, reps: 8, kwaliteit: 'controle' }, {}, squat)).toBe('80 kg × 8 · RIR 2');
  });
  it('per kant', () => {
    expect(snelleTekst({ opwarm: false, gewichtKg: 24, repsLinks: 8, repsRechts: 8 }, { doelRIR: 2 }, undefined)).toBe('24 kg × L8/R8 · RIR 2');
  });
  it('tijd, zonder RIR-doel', () => {
    expect(snelleTekst({ opwarm: false, gewichtKg: 32, duurSec: 45 }, {}, undefined)).toBe('32 kg · 45 s');
  });
  it('suitcase hold: de last één keer', () => {
    expect(snelleTekst({ opwarm: false, trede: '32 kg + vest 10', gewichtKg: 32, extraKg: 10, duurSec: 30 }, {}, undefined)).toBe('32 kg +10 kg · 30 s');
  });
  it('opwarmset zonder RIR', () => {
    expect(snelleTekst({ opwarm: true, gewichtKg: 40, reps: 5 }, { doelRIR: 2 }, squat)).toBe('40 kg × 5');
  });
});

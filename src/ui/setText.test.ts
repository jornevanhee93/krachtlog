import { describe, expect, it } from 'vitest';
import { oefening } from '../schema';
import { setTekst, snelleTekst } from './setText';

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
  it('opwarmset zonder RIR', () => {
    expect(snelleTekst({ opwarm: true, gewichtKg: 40, reps: 5 }, { doelRIR: 2 }, squat)).toBe('40 kg × 5');
  });
});

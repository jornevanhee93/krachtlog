import { describe, expect, it } from 'vitest';
import { oefening } from '../schema';
import { nieuweOefeningConcept } from './exerciseDraft';
import { valideer } from './parseFile';

describe('nieuwe oefening aanmaken', () => {
  it('een leeg concept kan zonder fout gemaakt worden', () => {
    expect(() => nieuweOefeningConcept('oef-1')).not.toThrow();
    expect(nieuweOefeningConcept('oef-1').naam).toBe('');
  });

  it('heeft dezelfde standaardwaarden als het schema', () => {
    expect(nieuweOefeningConcept('oef-1', 'Goblet squat')).toEqual(oefening.parse({ id: 'oef-1', naam: 'Goblet squat' }));
  });

  it('weigert bij Opslaan een lege naam, met een Nederlandse melding bij het veld', () => {
    for (const naam of ['', '   ']) {
      const res = valideer(oefening, nieuweOefeningConcept('oef-1', naam));
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.fouten).toEqual([{ pad: 'naam', bericht: 'naam ontbreekt' }]);
    }
  });

  it('bewaart een ingevulde oefening (naam getrimd)', () => {
    const res = valideer(oefening, { ...nieuweOefeningConcept('oef-1'), naam: '  Goblet squat ' });
    expect(res.ok && res.data.naam).toBe('Goblet squat');
  });
});

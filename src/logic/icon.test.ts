import { describe, expect, it } from 'vitest';
import { automatischIcoon, oefeningIcoon } from './icon';

const materiaal = [
  { id: 'kb', soort: 'kettlebell' as const },
  { id: 'vest', soort: 'vest' as const },
  { id: 'x', soort: 'overig' as const },
];

describe('icoon van een oefening', () => {
  it('volgt het eerste materiaal', () => {
    expect(automatischIcoon({ materiaalIds: ['vest', 'kb'] }, materiaal)).toBe('vest');
    expect(automatischIcoon({ materiaalIds: ['kb'] }, materiaal)).toBe('kettlebell');
  });
  it('zonder materiaal: lichaamsgewicht', () => {
    expect(automatischIcoon({ materiaalIds: [] }, materiaal)).toBe('lichaamsgewicht');
  });
  it('onbekend of "overig" materiaal: lichaamsgewicht', () => {
    expect(automatischIcoon({ materiaalIds: ['weg'] }, materiaal)).toBe('lichaamsgewicht');
    expect(automatischIcoon({ materiaalIds: ['x'] }, materiaal)).toBe('lichaamsgewicht');
  });
  it('een eigen keuze gaat voor', () => {
    expect(oefeningIcoon({ materiaalIds: ['kb'], icoon: 'macebell' }, materiaal)).toBe('macebell');
    expect(oefeningIcoon(undefined, materiaal)).toBe('lichaamsgewicht');
  });
});

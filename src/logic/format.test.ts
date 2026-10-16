import { describe, expect, it } from 'vitest';
import { dagenGeleden, formatGetal, formatKlok, minutenTussen } from './format';

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

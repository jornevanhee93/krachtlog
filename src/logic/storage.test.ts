import { describe, expect, it } from 'vitest';
import { formatMb, requestPersistence } from './storage';

describe('requestPersistence', () => {
  it('geeft "unsupported" als de browser het niet kent', async () => {
    expect(await requestPersistence(undefined)).toBe('unsupported');
    expect(await requestPersistence({})).toBe('unsupported');
  });

  it('vraagt niets opnieuw aan als het al blijvend is', async () => {
    let asked = false;
    const status = await requestPersistence({
      persisted: async () => true,
      persist: async () => {
        asked = true;
        return true;
      },
    });
    expect(status).toBe('persisted');
    expect(asked).toBe(false);
  });

  it('geeft het antwoord van persist() terug', async () => {
    expect(await requestPersistence({ persisted: async () => false, persist: async () => true })).toBe('persisted');
    expect(await requestPersistence({ persisted: async () => false, persist: async () => false })).toBe('notPersisted');
  });

  it('valt terug op "notPersisted" bij een fout', async () => {
    const status = await requestPersistence({
      persisted: async () => {
        throw new Error('kapot');
      },
      persist: async () => true,
    });
    expect(status).toBe('notPersisted');
  });
});

describe('formatMb', () => {
  it('toont megabytes met één decimaal en een komma', () => {
    expect(formatMb(1024 * 1024 * 2.5)).toBe('2,5');
  });
});

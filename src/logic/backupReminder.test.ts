import { describe, expect, it } from 'vitest';
import { backupHerinnering, sessiesSinds } from './backupReminder';

const nu = new Date(2026, 9, 29, 10, 0);
const sessie = (start: string, einde?: string) => ({ start, einde });

describe('backupHerinnering', () => {
  it('nog nooit een back-up', () => {
    expect(backupHerinnering({ sessies: [], nu })).toEqual({ reden: 'nooit' });
  });

  it('dagen: vanaf het ingestelde aantal dagen (standaard 7)', () => {
    const zes = new Date(2026, 9, 23, 9, 0).toISOString();
    const zeven = new Date(2026, 9, 22, 9, 0).toISOString();
    expect(backupHerinnering({ laatsteBackup: zes, sessies: [], nu })).toBeNull();
    expect(backupHerinnering({ laatsteBackup: zeven, sessies: [], nu })).toEqual({ reden: 'dagen', dagen: 7, sessies: 0 });
    expect(backupHerinnering({ laatsteBackup: zes, sessies: [], nu, naDagen: 5 })).toMatchObject({ reden: 'dagen', dagen: 6 });
  });

  it('sessies: vanaf het ingestelde aantal nieuwe sessies (standaard 3)', () => {
    const backup = new Date(2026, 9, 27, 20, 0).toISOString();
    const oud = sessie(new Date(2026, 9, 26, 18, 0).toISOString());
    const nieuw = [27, 28, 29].map((d) => sessie(new Date(2026, 9, d, 21, 0).toISOString()));
    nieuw[2] = sessie(new Date(2026, 9, 29, 8, 0).toISOString(), new Date(2026, 9, 29, 9, 0).toISOString());
    expect(backupHerinnering({ laatsteBackup: backup, sessies: [oud, ...nieuw.slice(0, 2)], nu })).toBeNull();
    expect(backupHerinnering({ laatsteBackup: backup, sessies: [oud, ...nieuw], nu })).toEqual({ reden: 'sessies', dagen: 2, sessies: 3 });
    expect(backupHerinnering({ laatsteBackup: backup, sessies: [oud, nieuw[0]], nu, naSessies: 1 })).toMatchObject({ reden: 'sessies', sessies: 1 });
  });

  it('een sessie die vóór de back-up begon maar erna eindigde telt mee', () => {
    const backup = new Date(2026, 9, 28, 18, 30).toISOString();
    expect(sessiesSinds(backup, [sessie(new Date(2026, 9, 28, 18, 0).toISOString(), new Date(2026, 9, 28, 19, 0).toISOString())])).toBe(1);
    expect(sessiesSinds(backup, [sessie('2026-10-20')])).toBe(0);
  });

  it('sessies gaan voor dagen als beide gelden', () => {
    const backup = new Date(2026, 9, 1, 9, 0).toISOString();
    const nieuw = [2, 3, 4].map((d) => sessie(new Date(2026, 9, d, 18, 0).toISOString()));
    expect(backupHerinnering({ laatsteBackup: backup, sessies: nieuw, nu })).toMatchObject({ reden: 'sessies', dagen: 28, sessies: 3 });
  });
});

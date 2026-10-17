// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db/db';
import { importeerVoorbeeld, renderApp, zetTestOmgevingOp } from '../test/app';
import { instellingen } from '../schema';

zetTestOmgevingOp();

describe('Vandaag met een programma', () => {
  beforeEach(() => {
    // Donderdag 29 oktober 2026, 10:00 (alleen de klok, de timers blijven echt).
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 29, 10, 0));
  });
  afterEach(() => vi.useRealTimers());

  it('toont de gemiste en de geplande sessie, en overslaan bewaart de status', async () => {
    await importeerVoorbeeld('bibliotheek.json');
    await importeerVoorbeeld('programma.json');
    renderApp('/');
    const gemist = await screen.findByTestId('gemist');
    expect(gemist.textContent).toMatch(/Sessie A van ma 26 okt 2026/);
    expect(screen.getByText('Gepland vandaag')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Overslaan' }));
    await waitFor(() => expect(screen.queryByTestId('gemist')).toBeNull());
    const st = await db.planning.toArray();
    expect(st).toMatchObject([{ status: 'overgeslagen', datum: '2026-10-26' }]);
  });

  it('zonder programma: alleen sjablonen en een lege sessie', async () => {
    renderApp('/');
    expect(await screen.findByText(/Lege sessie/)).toBeTruthy();
    expect(screen.queryByText('Gepland vandaag')).toBeNull();
  });
});

describe('Vandaag: back-upherinnering', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 29, 10, 0));
  });
  afterEach(() => vi.useRealTimers());

  const zetBackup = async (datum: Date, planning: Record<string, number> = {}) => {
    const inst = instellingen.parse({ laatsteBackup: datum.toISOString(), filosofie: { planning } });
    await db.instellingen.put({ key: 'instellingen', value: inst });
  };
  const sessie = (id: string, d: Date) => db.sessies.put({ id, start: d.toISOString(), einde: d.toISOString(), soort: 'kracht' } as never);

  it('niet na een recente back-up zonder nieuwe sessies', async () => {
    await zetBackup(new Date(2026, 9, 27, 9, 0));
    renderApp('/');
    expect(await screen.findByText(/Lege sessie/)).toBeTruthy();
    expect(screen.queryByTestId('backup-herinnering')).toBeNull();
  });

  it('na het ingestelde aantal dagen', async () => {
    await zetBackup(new Date(2026, 9, 25, 9, 0), { backupHerinneringDagen: 4 });
    renderApp('/');
    expect((await screen.findByTestId('backup-herinnering')).textContent).toMatch(/4 dagen oud/);
  });

  it('na het ingestelde aantal nieuwe sessies (standaard 3)', async () => {
    await zetBackup(new Date(2026, 9, 27, 9, 0));
    await sessie('a', new Date(2026, 9, 27, 18, 0));
    await sessie('b', new Date(2026, 9, 28, 18, 0));
    renderApp('/');
    expect(await screen.findByText(/Lege sessie/)).toBeTruthy();
    expect(screen.queryByTestId('backup-herinnering')).toBeNull();
    await sessie('c', new Date(2026, 9, 29, 8, 0));
    expect((await screen.findByTestId('backup-herinnering')).textContent).toMatch(/3 sessies bij/);
  });
});

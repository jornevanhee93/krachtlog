// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db/db';
import { importeerVoorbeeld, renderApp, zetTestOmgevingOp } from '../test/app';

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

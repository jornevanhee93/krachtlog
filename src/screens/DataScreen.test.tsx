// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { leesInstellingen, zetLaatsteBackup } from '../db/repo';
import { renderApp, zetTestOmgevingOp } from '../test/app';

zetTestOmgevingOp();

describe('instellingen', () => {
  it('bewaart de filosofie-standaarden en laat de laatste back-up staan', async () => {
    const backup = new Date('2026-10-10T10:00:00Z');
    await zetLaatsteBackup(backup);
    renderApp('/data');
    fireEvent.click(await screen.findByText('Instellingen'));
    fireEvent.change(screen.getByLabelText('Lichaamsgewicht (kg, optioneel)'), { target: { value: '74,5' } });
    fireEvent.change(screen.getByLabelText('Power: keer op rij strak'), { target: { value: '3' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Bewaren' })[0]);
    await screen.findByText('Instellingen bewaard.');
    const inst = await leesInstellingen();
    expect(inst.lichaamsgewichtKg).toBe(74.5);
    expect(inst.filosofie.profielen.power.sessiesOpRij).toBe(3);
    expect(inst.laatsteBackup).toBe(backup.toISOString());
  });

  it('weigert een ongeldige waarde met een melding', async () => {
    renderApp('/data');
    fireEvent.click(await screen.findByText('Instellingen'));
    fireEvent.change(screen.getByLabelText('Power: keer op rij strak'), { target: { value: '0' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Bewaren' })[0]);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/minstens 1/));
  });
});

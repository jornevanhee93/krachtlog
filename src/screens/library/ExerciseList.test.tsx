// @vitest-environment jsdom
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { importeerVoorbeeld, renderApp, zetTestOmgevingOp } from '../../test/app';

zetTestOmgevingOp();

describe('oefeningenlijst', () => {
  it('toont een lege lijst', async () => {
    renderApp('/oefeningen');
    expect(await screen.findByText('Nog geen oefeningen.')).toBeTruthy();
  });

  it('toont per oefening een icoon dat volgt uit het materiaal', async () => {
    await importeerVoorbeeld('bibliotheek.json');
    renderApp('/oefeningen');
    const rij = (await screen.findByText('Kettlebell swing')).closest('button')!;
    expect(rij.querySelector('svg.ex-icon')).toBeTruthy();
    const pullup = (await screen.findByText('Pull-up')).closest('button')!;
    expect(within(pullup).getByText(/ladder/)).toBeTruthy();
  });
});

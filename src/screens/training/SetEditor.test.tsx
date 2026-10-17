// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { oefening } from '../../schema';
import SetEditor from './SetEditor';

afterEach(cleanup);

const doe = () => {};
const boxJump = oefening.parse({
  id: 'bj',
  naam: 'Box jump',
  metingen: ['variant', 'reps'],
  progressie: { modus: 'ladder', profiel: 'power', treden: [{ label: 'Box 50' }] },
});
const squat = oefening.parse({ id: 'sq', naam: 'Squat', progressie: { modus: 'last', profiel: 'anker' } });

describe('SetEditor', () => {
  it('power: geen RIR-knoppen, wel kwaliteit', () => {
    render(<SetEditor set={{ opwarm: false, klaar: false, reps: 3 }} oefening={boxJump} onChange={doe} onKlaar={doe} onVerwijder={doe} />);
    expect(screen.queryByRole('group', { name: 'RIR' })).toBeNull();
    expect(screen.getByRole('group', { name: 'Kwaliteit' })).toBeTruthy();
  });

  it('andere profielen: RIR en kwaliteit', () => {
    render(<SetEditor set={{ opwarm: false, klaar: false, reps: 5 }} oefening={squat} onChange={doe} onKlaar={doe} onVerwijder={doe} />);
    expect(screen.getByRole('group', { name: 'RIR' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Kwaliteit' })).toBeTruthy();
  });
});

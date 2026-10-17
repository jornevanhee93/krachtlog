// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import OpslagMelding from './OpslagMelding';

afterEach(cleanup);

function zetOpslag(storage: object | undefined) {
  Object.defineProperty(navigator, 'storage', { value: storage, configurable: true });
}

describe('OpslagMelding', () => {
  it('toont een melding als de opslag niet blijvend is; "Opnieuw aanvragen" haalt ze weg zodra het lukt', async () => {
    let blijvend = false;
    let antwoord = false;
    zetOpslag({ persisted: async () => blijvend, persist: async () => ((blijvend = antwoord), antwoord) });
    render(<OpslagMelding />);
    expect(await screen.findByTestId('opslag-melding')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Opnieuw aanvragen' }));
    expect(await screen.findByText(/Nog niet gelukt/)).toBeTruthy();
    antwoord = true;
    fireEvent.click(screen.getByRole('button', { name: 'Opnieuw aanvragen' }));
    await waitFor(() => expect(screen.queryByTestId('opslag-melding')).toBeNull());
  });

  it('geen melding als de opslag al blijvend is of de browser het niet kent', async () => {
    zetOpslag({ persisted: async () => true, persist: async () => true });
    const { unmount } = render(<OpslagMelding />);
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.queryByTestId('opslag-melding')).toBeNull();
    unmount();
    zetOpslag(undefined);
    render(<OpslagMelding />);
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.queryByTestId('opslag-melding')).toBeNull();
  });
});

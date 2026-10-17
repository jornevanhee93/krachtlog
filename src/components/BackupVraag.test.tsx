// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { leesInstellingen } from '../db/repo';
import { zetTestOmgevingOp } from '../test/app';
import BackupVraag from './BackupVraag';

zetTestOmgevingOp();

function zetDelen(share: ((data: ShareData) => Promise<void>) | undefined) {
  Object.defineProperty(navigator, 'share', { value: share, configurable: true });
  Object.defineProperty(navigator, 'canShare', { value: share ? () => true : undefined, configurable: true });
}

describe('BackupVraag', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => zetDelen(undefined));

  it('deelt het back-upbestand via het deelmenu en zet dan pas "laatste back-up"', async () => {
    const share = vi.fn(async (_: ShareData) => {});
    zetDelen(share);
    const klaar = vi.fn();
    render(<BackupVraag onKlaar={klaar} />);
    expect(screen.getByText('Back-up maken?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back-up delen' }));
    await waitFor(() => expect(klaar).toHaveBeenCalled());
    const bestand = share.mock.calls[0][0].files![0];
    expect(bestand.name).toMatch(/^emerge-backup-.*\.json$/);
    expect(JSON.parse(await bestand.text())).toMatchObject({ soort: 'backup', schemaVersie: 5 });
    expect((await leesInstellingen()).laatsteBackup).toBeDefined();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('annuleren in het deelmenu: geen "laatste back-up", de vraag blijft staan', async () => {
    zetDelen(async () => {
      throw new DOMException('geannuleerd', 'AbortError');
    });
    const klaar = vi.fn();
    render(<BackupVraag onKlaar={klaar} />);
    fireEvent.click(screen.getByRole('button', { name: 'Back-up delen' }));
    expect(await screen.findByText('Geen back-up gemaakt.')).toBeTruthy();
    expect(klaar).not.toHaveBeenCalled();
    expect((await leesInstellingen()).laatsteBackup).toBeUndefined();
  });

  it('zonder deelmenu: downloaden en "laatste back-up" zetten', async () => {
    zetDelen(undefined);
    const klik = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const klaar = vi.fn();
    render(<BackupVraag onKlaar={klaar} />);
    fireEvent.click(screen.getByRole('button', { name: 'Back-up delen' }));
    await waitFor(() => expect(klaar).toHaveBeenCalled());
    expect(klik).toHaveBeenCalled();
    expect((await leesInstellingen()).laatsteBackup).toBeDefined();
    klik.mockRestore();
  });

  it('delen mislukt (geen annuleren): toch downloaden', async () => {
    zetDelen(async () => {
      throw new DOMException('niet toegestaan', 'NotAllowedError');
    });
    const klik = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const klaar = vi.fn();
    render(<BackupVraag onKlaar={klaar} />);
    fireEvent.click(screen.getByRole('button', { name: 'Back-up delen' }));
    await waitFor(() => expect(klaar).toHaveBeenCalled());
    expect(klik).toHaveBeenCalled();
    klik.mockRestore();
  });

  it('"Later" sluit zonder back-up', async () => {
    const klaar = vi.fn();
    render(<BackupVraag onKlaar={klaar} />);
    fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    expect(klaar).toHaveBeenCalled();
    expect((await leesInstellingen()).laatsteBackup).toBeUndefined();
  });
});

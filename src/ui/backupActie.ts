// Een back-up maken en delen (of downloaden). "Laatste back-up" wordt alleen gezet als dat gelukt is.
import { leesSnapshot, zetLaatsteBackup } from '../db/repo';
import { backupBestandsnaam, maakBackup } from '../logic/backup';
import { deelBestand, downloadJson, kanDelen } from './files';

export type BackupResultaat = 'gedeeld' | 'gedownload' | 'geannuleerd';

/**
 * Deelt de back-up via het deelmenu (Google Drive, OneDrive …). Zonder deelmenu, of als delen mislukt,
 * wordt het bestand gedownload. Annuleer je het deelmenu, dan gebeurt er niets.
 */
export async function deelBackup(delen: boolean = kanDelen()): Promise<BackupResultaat> {
  const nu = new Date();
  const backup = maakBackup(await leesSnapshot(), nu);
  const naam = backupBestandsnaam(nu);
  if (delen) {
    const res = await deelBestand(naam, backup);
    if (res === 'geannuleerd') return 'geannuleerd';
    if (res === 'gedeeld') {
      await zetLaatsteBackup(nu);
      return 'gedeeld';
    }
  }
  downloadJson(naam, backup);
  await zetLaatsteBackup(nu);
  return 'gedownload';
}

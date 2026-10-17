// Wanneer vraagt de app om een back-up? Puur, zodat het testbaar is zonder database.
import { dagenGeleden } from './format';

export const STANDAARD_HERINNERING_DAGEN = 7;
export const STANDAARD_HERINNERING_SESSIES = 3;

export type BackupHerinnering =
  | { reden: 'nooit' }
  | { reden: 'dagen'; dagen: number; sessies: number }
  | { reden: 'sessies'; dagen: number; sessies: number };

/** Aantal sessies dat na de laatste back-up gelogd werd (op einde, anders start). */
export function sessiesSinds(laatsteBackup: string, sessies: { start: string; einde?: string }[]): number {
  const grens = new Date(laatsteBackup).getTime();
  return sessies.filter((s) => new Date(s.einde ?? s.start).getTime() > grens).length;
}

/**
 * Een herinnering als er nog nooit een back-up was, als de laatste back-up minstens `naDagen` dagen oud is,
 * of als er sindsdien minstens `naSessies` sessies bijkwamen. Anders null.
 */
export function backupHerinnering(args: {
  laatsteBackup?: string;
  sessies: { start: string; einde?: string }[];
  nu?: Date;
  naDagen?: number;
  naSessies?: number;
}): BackupHerinnering | null {
  const { laatsteBackup, sessies, nu = new Date() } = args;
  if (!laatsteBackup) return { reden: 'nooit' };
  const dagen = dagenGeleden(laatsteBackup, nu);
  const nieuw = sessiesSinds(laatsteBackup, sessies);
  if (nieuw >= (args.naSessies ?? STANDAARD_HERINNERING_SESSIES)) return { reden: 'sessies', dagen, sessies: nieuw };
  if (dagen >= (args.naDagen ?? STANDAARD_HERINNERING_DAGEN)) return { reden: 'dagen', dagen, sessies: nieuw };
  return null;
}

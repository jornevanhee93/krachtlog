// Blijvende opslag (navigator.storage.persist) als pure functies.
// De StorageManager wordt meegegeven, zodat dit testbaar is zonder browser.

export type PersistStatus = 'persisted' | 'notPersisted' | 'unsupported';

export interface StorageLike {
  persisted?: () => Promise<boolean>;
  persist?: () => Promise<boolean>;
  estimate?: () => Promise<{ usage?: number; quota?: number }>;
}

/** Vraagt blijvende opslag aan (als dat nog niet zo is) en geeft de status terug. */
export async function requestPersistence(storage: StorageLike | undefined): Promise<PersistStatus> {
  if (!storage?.persist || !storage.persisted) return 'unsupported';
  try {
    if (await storage.persisted()) return 'persisted';
    return (await storage.persist()) ? 'persisted' : 'notPersisted';
  } catch {
    return 'notPersisted';
  }
}

/** Leest de huidige status, zonder iets aan te vragen. */
export async function leesPersistStatus(storage: StorageLike | undefined): Promise<PersistStatus> {
  if (!storage?.persisted) return 'unsupported';
  try {
    return (await storage.persisted()) ? 'persisted' : 'notPersisted';
  } catch {
    return 'notPersisted';
  }
}

/** Zet bytes om naar megabytes met één decimaal, in Nederlandse notatie. */
export function formatMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toLocaleString('nl-BE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

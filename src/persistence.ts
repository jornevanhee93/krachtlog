import { requestPersistence, type PersistStatus } from './logic/storage';

// Wordt één keer bij de start aangevraagd; het Data-scherm leest het resultaat.
let current: Promise<PersistStatus> | null = null;

export function startPersistence(): Promise<PersistStatus> {
  current = requestPersistence(navigator.storage);
  return current;
}

export function persistenceStatus(): Promise<PersistStatus> {
  return current ?? startPersistence();
}

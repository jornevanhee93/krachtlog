import { useEffect, useState } from 'react';

/** Houdt het scherm aan zolang `aan` true is (Screen Wake Lock API). */
export function useWakeLock(aan: boolean): boolean {
  const [actief, setActief] = useState(false);
  useEffect(() => {
    if (!aan || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let gestopt = false;
    const vraag = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
        if (gestopt) return void lock.release();
        setActief(true);
        lock.addEventListener('release', () => setActief(false));
      } catch {
        setActief(false);
      }
    };
    const opnieuw = () => {
      if (document.visibilityState === 'visible' && (!lock || lock.released)) void vraag();
    };
    void vraag();
    document.addEventListener('visibilitychange', opnieuw);
    return () => {
      gestopt = true;
      document.removeEventListener('visibilitychange', opnieuw);
      void lock?.release();
    };
  }, [aan]);
  return actief;
}

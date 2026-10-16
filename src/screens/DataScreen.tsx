import { useEffect, useState } from 'react';
import { nl } from '../i18n/nl';
import { formatMb, requestPersistence, type PersistStatus } from '../logic/storage';
import { persistenceStatus } from '../persistence';

export default function DataScreen() {
  const [status, setStatus] = useState<PersistStatus | null>(null);
  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(null);

  useEffect(() => {
    void persistenceStatus().then(setStatus);
    navigator.storage?.estimate?.().then((e) => {
      if (e.usage !== undefined && e.quota) setUsage({ used: e.usage, quota: e.quota });
    });
  }, []);

  const retry = async () => setStatus(await requestPersistence(navigator.storage));

  return (
    <section className="screen">
      <h1>{nl.data.title}</h1>

      <div className="card">
        <h2>{nl.data.storageTitle}</h2>
        <p className={`status status-${status ?? 'checking'}`}>
          {status ? nl.data.storageStatus[status] : nl.data.storageStatus.checking}
        </p>
        {status && <p className="muted">{nl.data.storageExplain[status]}</p>}
        {usage && <p className="muted small">{nl.data.usage(formatMb(usage.used), formatMb(usage.quota))}</p>}
        {status === 'notPersisted' && (
          <button className="btn" onClick={() => void retry()}>
            {nl.data.retry}
          </button>
        )}
      </div>

      <p className="muted">{nl.data.backupPlaceholder}</p>
    </section>
  );
}

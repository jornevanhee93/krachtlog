import { useEffect, useState } from 'react';
import { nl } from '../i18n/nl';
import { leesPersistStatus, type PersistStatus } from '../logic/storage';
import { persistenceStatus, vraagOpnieuw } from '../persistence';

const t = nl.today;

/** Melding op Vandaag zolang de opslag niet blijvend is. Verdwijnt zodra Chrome blijvende opslag geeft. */
export default function OpslagMelding() {
  const [status, setStatus] = useState<PersistStatus | null>(null);
  const [nogNiet, setNogNiet] = useState(false);

  useEffect(() => {
    let weg = false;
    // Eerst de aanvraag bij de start afwachten, dan de huidige stand lezen (die kan intussen veranderd zijn).
    void persistenceStatus()
      .then((s) => (s === 'notPersisted' ? leesPersistStatus(navigator.storage) : s))
      .then((s) => !weg && setStatus(s));
    return () => {
      weg = true;
    };
  }, []);

  if (status !== 'notPersisted') return null;

  const opnieuw = async () => {
    const s = await vraagOpnieuw();
    setStatus(s);
    setNogNiet(s === 'notPersisted');
  };

  return (
    <div className="card attention-card" data-testid="opslag-melding">
      <p>
        <strong>{t.opslagTitel}</strong>
      </p>
      <p className="small muted">{t.opslagUitleg}</p>
      <button className="btn btn-block" onClick={() => void opnieuw()}>
        {t.opslagOpnieuw}
      </button>
      {nogNiet && <p className="small muted">{t.opslagNogNiet}</p>}
    </div>
  );
}

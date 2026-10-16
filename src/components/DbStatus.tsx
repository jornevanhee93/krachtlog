import { useEffect, useState } from 'react';
import { db } from '../db/db';
import { nl } from '../i18n/nl';

/** Toont een melding als de database niet geopend of gelezen kan worden, of onverwacht sluit. */
export default function DbStatus() {
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    const controleer = () =>
      db
        .open()
        .then(() => db.oefeningen.count())
        .then(() => setFout(null))
        .catch((e: Error) => setFout(`${e.name}: ${e.message}`));
    // Sluit de database onverwacht (bv. site-gegevens gewist), probeer ze dan opnieuw te openen.
    const opGesloten = () => void controleer();
    db.on('close', opGesloten);
    void controleer();
    return () => db.on('close').unsubscribe(opGesloten);
  }, []);

  if (!fout) return null;
  const t = nl.opslagFout;
  return (
    <div className="db-fout" role="alert">
      <strong>{t.titel}</strong>
      <p>{t.uitleg}</p>
      <p className="small muted">{fout}</p>
      <button className="btn" onClick={() => window.location.reload()}>
        {t.herladen}
      </button>
    </div>
  );
}

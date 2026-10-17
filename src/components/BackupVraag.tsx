import { useState } from 'react';
import { nl } from '../i18n/nl';
import { deelBackup } from '../ui/backupActie';

const t = nl.backup;

/** Rustige kaart na het bewaren van een sessie: "Back-up maken?" met delen of later. */
export default function BackupVraag(props: { onKlaar: () => void }) {
  const [melding, setMelding] = useState('');
  const [bezig, setBezig] = useState(false);

  const deel = async () => {
    setBezig(true);
    try {
      const res = await deelBackup();
      if (res === 'geannuleerd') setMelding(t.geannuleerd);
      else props.onKlaar();
    } finally {
      setBezig(false);
    }
  };

  return (
    <div className="card" data-testid="backup-vraag">
      <h2>{t.vraagTitel}</h2>
      <p className="muted">{t.vraagUitleg}</p>
      <div className="row">
        <button className="btn grow" onClick={props.onKlaar}>
          {t.later}
        </button>
        <button className="btn btn-primary grow" disabled={bezig} onClick={() => void deel()}>
          {t.delen}
        </button>
      </div>
      {melding && <p className="muted small">{melding}</p>}
    </div>
  );
}

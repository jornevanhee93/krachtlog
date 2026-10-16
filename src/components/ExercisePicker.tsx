import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../db/db';
import { nl } from '../i18n/nl';
import { nieuweOefeningConcept } from '../logic/exerciseDraft';
import { nieuwId } from '../logic/ids';
import { valideer } from '../logic/parseFile';
import { normaliseer } from '../logic/matching';
import { oefening, type Oefening } from '../schema';

/** Volledig scherm om een oefening te kiezen, met zoeken en snel een nieuwe aanmaken. */
export default function ExercisePicker(props: { titel: string; onKies: (o: Oefening) => void; onSluit: () => void }) {
  const [zoek, setZoek] = useState('');
  const alle = useLiveQuery(() => db.oefeningen.orderBy('naam').toArray(), []);
  const q = normaliseer(zoek);
  const lijst = (alle ?? []).filter(
    (o) => !o.gearchiveerd && (!q || [o.naam, ...o.aliassen, ...o.patronen].some((n) => normaliseer(n).includes(q))),
  );
  const bestaatExact = (alle ?? []).some((o) => normaliseer(o.naam) === q);

  const maakNieuw = async () => {
    const res = valideer(oefening, nieuweOefeningConcept(nieuwId('oef'), zoek));
    if (!res.ok) return;
    await db.oefeningen.put(res.data);
    props.onKies(res.data);
  };

  return (
    <div className="sheet" role="dialog" aria-label={props.titel}>
      <div className="sheet-head">
        <h2>{props.titel}</h2>
        <button className="btn" onClick={props.onSluit}>
          {nl.algemeen.sluiten}
        </button>
      </div>
      <input
        type="search"
        className="search"
        placeholder={nl.algemeen.zoeken}
        value={zoek}
        autoFocus
        onChange={(e) => setZoek(e.target.value)}
      />
      <ul className="list">
        {lijst.map((o) => (
          <li key={o.id}>
            <button className="list-item" onClick={() => props.onKies(o)}>
              <strong>{o.naam}</strong>
              {o.patronen.length > 0 && <small className="muted">{o.patronen.join(', ')}</small>}
            </button>
          </li>
        ))}
      </ul>
      {zoek.trim() && !bestaatExact && (
        <button className="btn btn-block" onClick={() => void maakNieuw()}>
          + {nl.bibliotheek.nieuweOefening}: “{zoek.trim()}”
        </button>
      )}
    </div>
  );
}

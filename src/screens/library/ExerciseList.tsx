import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router';
import { Checkbox } from '../../components/form';
import { db } from '../../db/db';
import { nl } from '../../i18n/nl';
import { normaliseer } from '../../logic/matching';
import LibraryTabs from './LibraryTabs';

const t = nl.bibliotheek;
const ZOEK_KEY = 'krachtlog.oefeningen.filter';

function leesFilter(): { zoek: string; patroon: string } {
  try {
    return JSON.parse(sessionStorage.getItem(ZOEK_KEY) ?? '') as { zoek: string; patroon: string };
  } catch {
    return { zoek: '', patroon: '' };
  }
}

export default function ExerciseList() {
  const [filter, setFilterState] = useState(leesFilter);
  const [archief, setArchief] = useState(false);
  const oefeningen = useLiveQuery(() => db.oefeningen.orderBy('naam').toArray(), []);

  const setFilter = (f: { zoek: string; patroon: string }) => {
    setFilterState(f);
    try {
      sessionStorage.setItem(ZOEK_KEY, JSON.stringify(f));
    } catch {
      /* niet erg */
    }
  };

  const patronen = [...new Set((oefeningen ?? []).flatMap((o) => o.patronen))].sort((a, b) => a.localeCompare(b));
  const q = normaliseer(filter.zoek);
  const lijst = (oefeningen ?? []).filter(
    (o) =>
      (archief || !o.gearchiveerd) &&
      (!filter.patroon || o.patronen.includes(filter.patroon)) &&
      (!q || [o.naam, ...o.aliassen].some((n) => normaliseer(n).includes(q))),
  );

  return (
    <section className="screen">
      <h1>{nl.nav.exercises}</h1>
      <LibraryTabs />
      <input
        type="search"
        className="search"
        placeholder={nl.algemeen.zoeken}
        value={filter.zoek}
        onChange={(e) => setFilter({ ...filter, zoek: e.target.value })}
      />
      {patronen.length > 0 && (
        <div className="chips scroll-x">
          <button className={!filter.patroon ? 'chip active' : 'chip'} onClick={() => setFilter({ ...filter, patroon: '' })}>
            {t.alle}
          </button>
          {patronen.map((p) => (
            <button
              key={p}
              className={filter.patroon === p ? 'chip active' : 'chip'}
              onClick={() => setFilter({ ...filter, patroon: filter.patroon === p ? '' : p })}
            >
              {p}
            </button>
          ))}
        </div>
      )}
      <Link to="/oefeningen/nieuw" className="btn btn-primary btn-block">
        + {t.nieuweOefening}
      </Link>
      {oefeningen && lijst.length === 0 && <p className="muted">{t.geenOefeningen}</p>}
      <ul className="list">
        {lijst.map((o) => (
          <li key={o.id}>
            <Link to={`/oefeningen/${encodeURIComponent(o.id)}`} className="list-item">
              <strong>
                {o.naam}
                {o.gearchiveerd && <small className="muted"> · {t.gearchiveerd}</small>}
              </strong>
              <small className="muted">
                {[o.patronen.join(', '), o.progressie?.modus === 'ladder' ? t.ladder(o.progressie.treden.length) : '']
                  .filter(Boolean)
                  .join(' · ')}
              </small>
            </Link>
          </li>
        ))}
      </ul>
      {(oefeningen ?? []).some((o) => o.gearchiveerd) && (
        <Checkbox label={t.toonGearchiveerd} checked={archief} onChange={setArchief} />
      )}
    </section>
  );
}

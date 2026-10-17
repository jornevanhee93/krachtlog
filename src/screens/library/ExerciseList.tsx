import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import ExerciseIcon from '../../components/ExerciseIcon';
import ExerciseOverview from '../../components/ExerciseOverview';
import { Checkbox } from '../../components/form';
import { db } from '../../db/db';
import { nl } from '../../i18n/nl';
import { oefeningIcoon } from '../../logic/icon';
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
  const [info, setInfo] = useState<string | null>(null);
  const navigate = useNavigate();
  const oefeningen = useLiveQuery(() => db.oefeningen.orderBy('naam').toArray(), []);
  const materiaal = useLiveQuery(() => db.materiaal.toArray(), []) ?? [];

  const setFilter = (f: { zoek: string; patroon: string }) => {
    setFilterState(f);
    try {
      sessionStorage.setItem(ZOEK_KEY, JSON.stringify(f));
    } catch {
      /* niet erg */
    }
  };

  const patronen = [...new Set((oefeningen ?? []).flatMap((o) => o.patronen))].sort((a, b) => a.localeCompare(b));
  // Een bewaard patroon dat niet meer bestaat, filtert niet.
  const patroon = patronen.includes(filter.patroon) ? filter.patroon : '';
  const q = normaliseer(filter.zoek);
  const lijst = (oefeningen ?? []).filter(
    (o) =>
      (archief || !o.gearchiveerd) &&
      (!patroon || o.patronen.includes(patroon)) &&
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
        <label className="field">
          <span>{t.patroon}</span>
          <select value={patroon} onChange={(e) => setFilter({ ...filter, patroon: e.target.value })}>
            <option value="">{t.allePatronen}</option>
            {patronen.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      )}
      <Link to="/oefeningen/nieuw" className="btn btn-primary btn-block">
        + {t.nieuweOefening}
      </Link>
      {oefeningen && lijst.length === 0 && <p className="muted">{t.geenOefeningen}</p>}
      <ul className="list">
        {lijst.map((o) => (
          <li key={o.id}>
            <button className="list-item with-icon" onClick={() => setInfo(o.id)}>
              <ExerciseIcon icoon={oefeningIcoon(o, materiaal)} />
              <span className="grow">
                <strong>
                  {o.naam}
                  {o.gearchiveerd && <small className="muted"> · {t.gearchiveerd}</small>}
                </strong>
                <small className="muted">
                  {[o.patronen.join(', '), o.progressie?.modus === 'ladder' ? t.ladder(o.progressie.treden.length) : '']
                    .filter(Boolean)
                    .join(' · ')}
                </small>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {(oefeningen ?? []).some((o) => o.gearchiveerd) && (
        <Checkbox label={t.toonGearchiveerd} checked={archief} onChange={setArchief} />
      )}
      {info && (
        <ExerciseOverview
          oefeningId={info}
          onSluit={() => setInfo(null)}
          onBewerk={() => navigate(`/oefeningen/${encodeURIComponent(info)}`, { replace: true })}
        />
      )}
    </section>
  );
}

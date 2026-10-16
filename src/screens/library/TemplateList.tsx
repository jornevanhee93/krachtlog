import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { db } from '../../db/db';
import { nl } from '../../i18n/nl';
import LibraryTabs from './LibraryTabs';

const t = nl.bibliotheek;

export default function TemplateList() {
  const lijst = useLiveQuery(() => db.sjablonen.orderBy('naam').toArray(), []);
  return (
    <section className="screen">
      <h1>{nl.nav.exercises}</h1>
      <LibraryTabs />
      <Link to="/sjablonen/nieuw" className="btn btn-primary btn-block">
        + {t.nieuwSjabloon}
      </Link>
      {lijst && lijst.length === 0 && <p className="muted">{t.geenSjablonen}</p>}
      <ul className="list">
        {lijst?.map((s) => (
          <li key={s.id}>
            <Link to={`/sjablonen/${encodeURIComponent(s.id)}`} className="list-item">
              <strong>{s.naam}</strong>
              <small className="muted">
                {t.groepen(s.groepen.length)} · {t.oefeningenTeller(s.groepen.reduce((n, g) => n + g.items.length, 0))}
              </small>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

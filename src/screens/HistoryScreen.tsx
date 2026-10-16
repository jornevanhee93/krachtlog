import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { db } from '../db/db';
import { leesGepland } from '../db/repo';
import { nl } from '../i18n/nl';
import { formatDatumTijd } from '../logic/format';

const t = nl.history;

export function Plezier({ waarde }: { waarde: number | undefined }) {
  if (!waarde) return null;
  return (
    <span className="stars" aria-label={`${t.plezier} ${waarde}/5`}>
      {'★'.repeat(waarde)}
      <span className="muted">{'★'.repeat(5 - waarde)}</span>
    </span>
  );
}

export default function HistoryScreen() {
  const sessies = useLiveQuery(() => db.sessies.orderBy('start').reverse().toArray(), []);
  const sjablonen = useLiveQuery(() => db.sjablonen.toArray(), []);
  const aantallen = useLiveQuery(async () => {
    const map = new Map<string, number>();
    await db.entries.each((e) => map.set(e.sessieId, (map.get(e.sessieId) ?? 0) + 1));
    return map;
  }, []);
  const gepland = useLiveQuery(() => leesGepland(), []);
  const sjabNaam = new Map((sjablonen ?? []).map((s) => [s.id, s.naam]));
  const planNaam = new Map((gepland ?? []).map((g) => [g.key, g.sessie.naam]));

  return (
    <section className="screen">
      <h1>{t.title}</h1>
      {sessies && sessies.length === 0 && <p className="muted">{t.leeg}</p>}
      <ul className="list">
        {sessies?.map((s) => (
          <li key={s.id}>
            <Link to={`/historiek/${encodeURIComponent(s.id)}`} className="list-item">
              <strong>{formatDatumTijd(s.start)}</strong>
              <small className="muted">
                {[
                  s.sjabloonId ? sjabNaam.get(s.sjabloonId) : s.planningId ? planNaam.get(s.planningId) : undefined,
                  aantallen ? nl.bibliotheek.oefeningenTeller(aantallen.get(s.id) ?? 0) : undefined,
                  s.duurMin !== undefined ? t.minuten(s.duurMin) : undefined,
                  s.rpe !== undefined ? t.rpe(s.rpe) : undefined,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </small>
              <Plezier waarde={s.plezier} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

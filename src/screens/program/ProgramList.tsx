import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { db } from '../../db/db';
import { nl } from '../../i18n/nl';
import { formatDatum } from '../../logic/format';
import { planProgramma } from '../../logic/planning';

const t = nl.programma;

export default function ProgramList() {
  const programmas = useLiveQuery(() => db.programmas.orderBy('naam').toArray(), []);
  const statussen = useLiveQuery(() => db.planning.toArray(), []);

  return (
    <section className="screen">
      <h1>{t.titel}</h1>
      {programmas && programmas.length === 0 && (
        <>
          <p className="muted">{t.geen}</p>
          <Link to="/data" className="btn btn-block">
            {t.naarImport}
          </Link>
        </>
      )}
      <ul className="list">
        {programmas?.map((p) => {
          const g = planProgramma(p, statussen ?? []);
          const klaar = g.filter((x) => x.status !== 'gepland').length;
          return (
            <li key={p.id}>
              <Link to={`/programmas/${encodeURIComponent(p.id)}`} className="list-item">
                <strong>{p.naam}</strong>
                <small className="muted">
                  {t.vanaf(formatDatum(p.startDatum))} · {t.voortgang(klaar, g.length)}
                </small>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

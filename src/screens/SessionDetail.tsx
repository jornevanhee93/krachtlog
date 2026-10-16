import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router';
import { db } from '../db/db';
import { verwijderSessie } from '../db/repo';
import { nl } from '../i18n/nl';
import { formatDatumTijd } from '../logic/format';
import { setTekst } from '../ui/setText';
import { Plezier } from './HistoryScreen';

const t = nl.history;

export default function SessionDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const sessie = useLiveQuery(() => db.sessies.get(id), [id]);
  const entries = useLiveQuery(() => db.entries.where('sessieId').equals(id).sortBy('volgorde'), [id]);
  const oefeningen = useLiveQuery(() => db.oefeningen.toArray(), []);
  const naam = new Map((oefeningen ?? []).map((o) => [o.id, o.naam]));

  if (sessie === undefined) return null;
  if (!sessie) return <section className="screen"><p className="muted">{nl.algemeen.nietGevonden}</p></section>;

  const verwijder = async () => {
    if (!window.confirm(t.verwijderVraag)) return;
    await verwijderSessie(sessie.id);
    navigate('/historiek', { replace: true });
  };

  return (
    <section className="screen">
      <h1>{formatDatumTijd(sessie.start)}</h1>
      <p>
        {[sessie.duurMin !== undefined ? t.minuten(sessie.duurMin) : '', sessie.rpe !== undefined ? t.rpe(sessie.rpe) : '']
          .filter(Boolean)
          .join(' · ')}{' '}
        <Plezier waarde={sessie.plezier} />
      </p>
      {sessie.notitie && <p className="note">{sessie.notitie}</p>}
      {entries?.map((e) => (
        <div key={e.id} className="card">
          <h2>
            {e.groep && <span className="muted">{e.groep} · </span>}
            {naam.get(e.oefeningId) ?? nl.algemeen.onbekendeOefening}
          </h2>
          <ol className="set-list compact">
            {e.sets.map((s, i) => (
              <li key={i} className={s.opwarm ? 'muted' : ''}>
                {s.opwarm ? `${t.opwarm}: ` : s.ronde ? `R${s.ronde}: ` : ''}
                {setTekst(s) || '—'}
                {s.notitie && <em> — {s.notitie}</em>}
              </li>
            ))}
          </ol>
          {e.notitie && <p className="small muted">{e.notitie}</p>}
        </div>
      ))}
      <button className="btn btn-block" onClick={() => navigate(-1)}>
        {nl.algemeen.terug}
      </button>
      <button className="btn btn-danger btn-block" onClick={() => void verwijder()}>
        {nl.algemeen.verwijderen}
      </button>
    </section>
  );
}

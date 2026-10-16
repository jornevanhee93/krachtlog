import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate, useParams } from 'react-router';
import { db } from '../../db/db';
import { leesInstellingen, verwijderProgramma } from '../../db/repo';
import { nl } from '../../i18n/nl';
import { formatDatum } from '../../logic/format';
import { lokaleDatum, planProgramma, termijnen, type GeplandeSessie } from '../../logic/planning';

const t = nl.programma;

export function StatusTeken({ g, vandaag }: { g: GeplandeSessie; vandaag: string }) {
  const teken =
    g.status === 'gedaan' ? '✓' : g.status === 'ingehaald' ? '✓' : g.status === 'overgeslagen' ? '–' : g.datum < vandaag ? '!' : g.datum === vandaag ? '●' : '';
  return (
    <span className="status-teken" aria-label={t.status[g.status === 'gepland' && g.datum < vandaag ? 'gemist' : g.status]}>
      {teken}
    </span>
  );
}

export default function ProgramDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const programma = useLiveQuery(() => db.programmas.get(id), [id]);
  const statussen = useLiveQuery(() => db.planning.where('programmaId').equals(id).toArray(), [id]);
  const oefeningen = useLiveQuery(() => db.oefeningen.toArray(), []);
  const inst = useLiveQuery(() => leesInstellingen(), []);
  if (programma === undefined) return null;
  if (!programma) return <section className="screen"><p className="muted">{nl.algemeen.nietGevonden}</p></section>;

  const vandaag = lokaleDatum(new Date());
  const gepland = planProgramma(programma, statussen ?? []);
  const naam = new Map((oefeningen ?? []).map((o) => [o.id, o.naam]));
  const waarschuwingen = inst ? termijnen(gepland, inst.filosofie, vandaag).filter((x) => x.teLang) : [];

  // Groeperen per blok en week.
  const weken: { titel: string; items: GeplandeSessie[] }[] = [];
  for (const g of gepland) {
    const titel = `${g.blokNaam} · ${t.week(g.week)}${g.weekLabel ? ` · ${g.weekLabel}` : ''}`;
    const laatste = weken[weken.length - 1];
    if (laatste && laatste.titel === titel) laatste.items.push(g);
    else weken.push({ titel, items: [g] });
  }

  const verwijder = async () => {
    if (!window.confirm(t.verwijderVraag)) return;
    await verwijderProgramma(programma.id);
    navigate('/programmas', { replace: true });
  };

  return (
    <section className="screen">
      <h1>{programma.naam}</h1>
      <p className="muted">{t.vanaf(formatDatum(programma.startDatum))}</p>
      {programma.notitie && <p className="note">{programma.notitie}</p>}
      {waarschuwingen.map((x) => (
        <p key={`${x.oefeningId}-${x.rol}`} className="warn">
          {t.termijnPlan(naam.get(x.oefeningId) ?? x.oefeningId, nl.sjabloon.rollen[x.rol], x.wekenGepland, x.min, x.max)}
        </p>
      ))}
      {weken.map((w) => (
        <div key={w.titel} className="week">
          <h3>{w.titel}</h3>
          <ul className="list">
            {w.items.map((g) => (
              <li key={g.key}>
                <Link to={`/gepland/${encodeURIComponent(g.key)}`} className={`list-item with-icon ${g.status === 'overgeslagen' ? 'muted' : ''}`}>
                  <StatusTeken g={g} vandaag={vandaag} />
                  <span className="grow">
                    <strong>{g.sessie.naam}</strong>
                    <small className="muted">
                      {[formatDatum(g.datum), g.tijd, g.aangepast ? nl.today.aangepast : '', g.status !== 'gepland' ? t.status[g.status] : '']
                        .filter(Boolean)
                        .join(' · ')}
                    </small>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <button className="btn btn-danger btn-block" onClick={() => void verwijder()}>
        {t.verwijderen}
      </button>
    </section>
  );
}

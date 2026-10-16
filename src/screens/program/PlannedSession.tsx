import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import ExerciseIcon from '../../components/ExerciseIcon';
import ExercisePicker from '../../components/ExercisePicker';
import { db } from '../../db/db';
import { leesGepland, zetPlanStatus } from '../../db/repo';
import { useStartTraining } from '../../hooks/useStartTraining';
import { nl } from '../../i18n/nl';
import { formatDatum } from '../../logic/format';
import { oefeningIcoon } from '../../logic/icon';
import { lokaleDatum, overslaan, pasAan, vervangItem, verwijderItem, voegItemToe } from '../../logic/planning';
import type { SjabloonGroep } from '../../schema';
import { doelTekst } from '../../ui/setText';

const t = nl.programma;

type Picker = { soort: 'toevoegen' } | { soort: 'vervangen'; gi: number; ii: number };

/** Eén geplande sessie: bekijken, voor deze ene keer aanpassen, starten of overslaan. */
export default function PlannedSession() {
  const { key = '' } = useParams();
  const gepland = useLiveQuery(() => leesGepland(), []);
  const oefeningen = useLiveQuery(() => db.oefeningen.toArray(), []);
  const materiaal = useLiveQuery(() => db.materiaal.toArray(), []) ?? [];
  const actief = useLiveQuery(() => db.actief.get('actief'), []);
  const { startGepland, bezig } = useStartTraining();
  const [picker, setPicker] = useState<Picker | null>(null);

  if (gepland === undefined) return null;
  const g = gepland.find((x) => x.key === key);
  if (!g) return <section className="screen"><p className="muted">{nl.algemeen.nietGevonden}</p></section>;

  const perId = new Map((oefeningen ?? []).map((o) => [o.id, o]));
  const vandaag = lokaleDatum(new Date());
  const open = g.status === 'gepland';

  const bewaar = async (groepen: SjabloonGroep[]) => {
    if (groepen.length === 0) return window.alert(t.minstensEen);
    await zetPlanStatus(pasAan(g, groepen, await db.planning.get(g.key)));
  };
  const herstel = async () => {
    const st = await db.planning.get(g.key);
    if (!st) return;
    const { aanpassing: _a, ...rest } = st;
    if (rest.status === 'gepland') await db.planning.delete(g.key);
    else await zetPlanStatus(rest);
  };
  const sla = async () => {
    if (!window.confirm(nl.today.overslaanVraag(g.sessie.naam, formatDatum(g.datum)))) return;
    await zetPlanStatus(overslaan(g, await db.planning.get(g.key)));
  };
  const terugNaarGepland = async () => {
    const st = await db.planning.get(g.key);
    if (!st) return;
    const { sessieId: _s, op: _o, ...rest } = st;
    await zetPlanStatus({ ...rest, status: 'gepland' });
  };

  return (
    <section className="screen">
      <h1>{g.sessie.naam}</h1>
      <p className="muted">
        {[formatDatum(g.datum), g.tijd, g.programmaNaam, `${g.blokNaam} · ${t.week(g.week)}`].filter(Boolean).join(' · ')}
      </p>
      {g.status !== 'gepland' && (
        <p className="ok">
          {t.status[g.status]}
          {g.sessieId && (
            <>
              {' · '}
              <Link to={`/historiek/${encodeURIComponent(g.sessieId)}`}>{t.bekijkSessie}</Link>
            </>
          )}
        </p>
      )}
      {open && g.datum < vandaag && <p className="warn">{t.gemistUitleg}</p>}
      {g.sessie.notitie && <p className="note">{g.sessie.notitie}</p>}
      {g.sessie.opwarming.length > 0 && (
        <details className="card">
          <summary>{nl.training.opwarming}</summary>
          <ul>
            {g.sessie.opwarming.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </details>
      )}

      {g.sessie.groepen.map((groep, gi) => (
        <div key={gi} className={`group group-${groep.type}`}>
          <div className="group-head">
            <strong>{groep.label ?? gi + 1}</strong>
            <span className="muted">
              {nl.groepTypes[groep.type]}
              {(groep.type === 'superset' || groep.type === 'circuit') && ` · ${nl.training.rondes(groep.rondes)}`}
            </span>
          </div>
          <ul className="list">
            {groep.items.map((it, ii) => {
              const o = perId.get(it.oefeningId);
              return (
                <li key={ii} className="planned-item">
                  <div className="list-item with-icon">
                    <ExerciseIcon icoon={oefeningIcoon(o, materiaal)} />
                    <span className="grow">
                      <strong>{o?.naam ?? nl.algemeen.onbekendeOefening}</strong>
                      <small className="muted">{doelTekst(it, o)}</small>
                    </span>
                  </div>
                  {open && (
                    <div className="row">
                      <button className="btn btn-small" onClick={() => setPicker({ soort: 'vervangen', gi, ii })}>
                        {nl.training.vervangen}
                      </button>
                      <button
                        className="btn btn-small"
                        onClick={() => void bewaar(verwijderItem(g.sessie.groepen, gi, ii))}
                        aria-label={`${nl.training.verwijderen}: ${o?.naam ?? ''}`}
                      >
                        {nl.training.verwijderen}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {open && (
        <>
          <button className="btn btn-block" onClick={() => setPicker({ soort: 'toevoegen' })}>
            + {nl.training.oefeningToevoegen}
          </button>
          {g.aangepast && (
            <button className="btn btn-block" onClick={() => void herstel()}>
              {t.herstelPlan}
            </button>
          )}
          <button className="btn btn-primary btn-block btn-big" disabled={bezig || Boolean(actief)} onClick={() => void startGepland(g)}>
            {g.datum < vandaag ? nl.today.inhalen : t.start}
          </button>
          {actief && <p className="muted small">{nl.today.actiefBezig}</p>}
          <button className="btn btn-block" onClick={() => void sla()}>
            {nl.today.overslaan}
          </button>
        </>
      )}
      {g.status === 'overgeslagen' && (
        <button className="btn btn-block" onClick={() => void terugNaarGepland()}>
          {t.tochPlannen}
        </button>
      )}

      {picker && (
        <ExercisePicker
          titel={picker.soort === 'vervangen' ? nl.training.vervangen : nl.training.oefeningToevoegen}
          onKies={(o) => {
            const p = picker;
            setPicker(null);
            void bewaar(p.soort === 'vervangen' ? vervangItem(g.sessie.groepen, p.gi, p.ii, o.id) : voegItemToe(g.sessie.groepen, o.id));
          }}
          onSluit={() => setPicker(null)}
        />
      )}
    </section>
  );
}

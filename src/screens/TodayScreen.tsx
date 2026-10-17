import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router';
import OpslagMelding from '../components/OpslagMelding';
import { db } from '../db/db';
import { leesActief, leesGepland, leesInstellingen, zetPlanStatus } from '../db/repo';
import { useStartTraining } from '../hooks/useStartTraining';
import { nl } from '../i18n/nl';
import { backupHerinnering } from '../logic/backupReminder';
import { formatDatum, formatDatumTijd } from '../logic/format';
import { deelBackup } from '../ui/backupActie';
import { lokaleDatum, overslaan, overzicht, termijnen, type GeplandeSessie } from '../logic/planning';

const t = nl.today;

export default function TodayScreen() {
  const actief = useLiveQuery(() => leesActief(), []);
  const sjablonen = useLiveQuery(() => db.sjablonen.orderBy('naam').toArray(), []);
  const instellingen = useLiveQuery(() => leesInstellingen(), []);
  const gepland = useLiveQuery(() => leesGepland(), []);
  const oefeningen = useLiveQuery(() => db.oefeningen.toArray(), []);
  const sessies = useLiveQuery(() => db.sessies.toArray(), []);
  const [backupBezig, setBackupBezig] = useState(false);
  const { start, startGepland, bezig } = useStartTraining();
  const vandaag = lokaleDatum(new Date());
  const plan = gepland ? overzicht(gepland, vandaag) : undefined;
  const naam = new Map((oefeningen ?? []).map((o) => [o.id, o.naam]));
  const teLang =
    gepland && instellingen ? termijnen(gepland, instellingen.filosofie, vandaag).filter((x) => x.nuTeLang) : [];

  const sla = async (g: GeplandeSessie) => {
    if (!window.confirm(t.overslaanVraag(g.sessie.naam, formatDatum(g.datum)))) return;
    await zetPlanStatus(overslaan(g, await db.planning.get(g.key)));
  };

  const herinnering =
    instellingen && sessies
      ? backupHerinnering({
          laatsteBackup: instellingen.laatsteBackup,
          sessies,
          naDagen: instellingen.filosofie.planning.backupHerinneringDagen,
          naSessies: instellingen.filosofie.planning.backupHerinneringSessies,
        })
      : null;
  const deel = async () => {
    setBackupBezig(true);
    try {
      await deelBackup();
    } finally {
      setBackupBezig(false);
    }
  };
  const heeftPlan = Boolean(gepland && gepland.length > 0);

  return (
    <section className="screen">
      <h1>{t.title}</h1>

      {actief ? (
        <Link to="/training" className="card card-link highlight">
          <strong>{t.verder}</strong>
          <span className="muted">
            {actief.sjabloonNaam ? `${actief.sjabloonNaam} · ` : ''}
            {t.verderUitleg(formatDatumTijd(actief.start))}
          </span>
        </Link>
      ) : (
        <>
          {plan && plan.gemist.length > 0 && (
            <>
              <h2>{t.gemistTitel}</h2>
              {plan.gemist.map((g) => (
                <div key={g.key} className="card warn-card" data-testid="gemist">
                  <p>
                    {t.gemist(g.sessie.naam, formatDatum(g.datum))}
                    <br />
                    <span className="small muted">{g.programmaNaam}</span>
                  </p>
                  <div className="row">
                    <button className="btn btn-primary grow" disabled={bezig} onClick={() => void startGepland(g)}>
                      {t.inhalen}
                    </button>
                    <button className="btn grow" onClick={() => void sla(g)}>
                      {t.overslaan}
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {plan && plan.vandaag.length > 0 && (
            <>
              <h2>{t.geplandVandaag}</h2>
              <ul className="list">
                {plan.vandaag.map((g) => (
                  <li key={g.key} className="row-with-action">
                    <button className="list-item big" disabled={bezig} onClick={() => void startGepland(g)}>
                      <strong>▶ {g.sessie.naam}</strong>
                      <small className="muted">
                        {[g.programmaNaam, g.tijd, g.aangepast ? t.aangepast : ''].filter(Boolean).join(' · ')}
                      </small>
                    </button>
                    <Link className="btn btn-small" to={`/gepland/${encodeURIComponent(g.key)}`}>
                      {t.aanpassen}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}

          <h2>{t.startTitel}</h2>
          <ul className="list">
            {sjablonen?.map((s) => (
              <li key={s.id}>
                <button className="list-item big" disabled={bezig} onClick={() => void start(s)}>
                  <strong>▶ {s.naam}</strong>
                  <small className="muted">
                    {nl.bibliotheek.oefeningenTeller(s.groepen.reduce((n, g) => n + g.items.length, 0))}
                  </small>
                </button>
              </li>
            ))}
            <li>
              <button className="list-item big" disabled={bezig} onClick={() => void start(undefined)}>
                <strong>＋ {t.leeg}</strong>
                <small className="muted">{t.leegUitleg}</small>
              </button>
            </li>
          </ul>
          {sjablonen && sjablonen.length === 0 && !heeftPlan && <p className="muted">{t.geenSjablonen}</p>}
        </>
      )}

      {plan?.volgende && (
        <p>
          <Link to={`/gepland/${encodeURIComponent(plan.volgende.key)}`} className="muted">
            {t.volgende(plan.volgende.sessie.naam, formatDatum(plan.volgende.datum))}
          </Link>
        </p>
      )}

      {teLang.map((x) => (
        <p key={`${x.oefeningId}-${x.rol}`} className="warn">
          {t.termijnTeLang(naam.get(x.oefeningId) ?? x.oefeningId, nl.sjabloon.rollen[x.rol], x.wekenTotNu, x.min, x.max)}
        </p>
      ))}

      {herinnering && (
        <div className="card attention-card" data-testid="backup-herinnering">
          <p>
            <strong>
              {herinnering.reden === 'nooit'
                ? t.backupNooit
                : herinnering.reden === 'sessies'
                  ? t.backupSessies(herinnering.sessies)
                  : t.backupOud(herinnering.dagen)}
            </strong>
          </p>
          <div className="row">
            <Link to="/data" className="btn grow">
              {t.backupKnop}
            </Link>
            <button className="btn btn-primary grow" disabled={backupBezig} onClick={() => void deel()}>
              {nl.backup.delen}
            </button>
          </div>
        </div>
      )}

      <OpslagMelding />

      <Link to="/programmas" className="btn btn-block">
        {t.programmas}
      </Link>
    </section>
  );
}

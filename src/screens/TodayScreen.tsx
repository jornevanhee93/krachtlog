import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { db } from '../db/db';
import { bewaarActief, leesActief, leesInstellingen, voorstellenVoor, vorigeSets } from '../db/repo';
import { nl } from '../i18n/nl';
import { startSessie } from '../logic/activeSession';
import { dagenGeleden, formatDatumTijd } from '../logic/format';
import type { Sjabloon } from '../schema';

const t = nl.today;

export default function TodayScreen() {
  const navigate = useNavigate();
  const actief = useLiveQuery(() => leesActief(), []);
  const sjablonen = useLiveQuery(() => db.sjablonen.orderBy('naam').toArray(), []);
  const instellingen = useLiveQuery(() => leesInstellingen(), []);
  const [bezig, setBezig] = useState(false);

  const start = async (sjabloon: Sjabloon | undefined) => {
    if (bezig) return;
    setBezig(true);
    try {
      if (await leesActief()) return window.alert(t.actiefBezig);
      const ids = sjabloon ? sjabloon.groepen.flatMap((g) => g.items.map((i) => i.oefeningId)) : [];
      const s = startSessie(sjabloon, await db.oefeningen.toArray(), await vorigeSets(ids), new Date(), await voorstellenVoor(ids));
      await bewaarActief(s);
      navigate('/training');
    } finally {
      setBezig(false);
    }
  };

  const laatste = instellingen?.laatsteBackup;
  const herinnerNa = instellingen?.filosofie.planning.backupHerinneringDagen ?? 7;
  const oud = laatste ? dagenGeleden(laatste) : null;
  const toonHerinnering = instellingen && (oud === null || oud >= herinnerNa);

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
          {sjablonen && sjablonen.length === 0 && <p className="muted">{t.geenSjablonen}</p>}
        </>
      )}

      {toonHerinnering && (
        <div className="card warn-card">
          <p>{oud === null ? t.backupNooit : t.backupOud(oud)}</p>
          <Link to="/data" className="btn">
            {t.backupKnop}
          </Link>
        </div>
      )}
    </section>
  );
}

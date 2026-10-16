import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import ExerciseOverview from '../components/ExerciseOverview';
import ExercisePicker from '../components/ExercisePicker';
import { db } from '../db/db';
import { bewaarActief, bewaarSessie, leesActief, markeerGepland, voorstellenVoor, vorigeSets, wisActief } from '../db/repo';
import { useProgressie } from '../hooks/useProgressie';
import { voorstelTekst, type Voorstel } from '../logic/progression';
import { useNow } from '../hooks/useNow';
import { useWakeLock } from '../hooks/useWakeLock';
import { nl } from '../i18n/nl';
import {
  allesAfgewerkt,
  naarSessie,
  naarSjabloon,
  vervangOefening,
  verwijderOefening,
  voegOefeningToe,
  wisselOpen,
  type ActiveSession,
  type Focus,
} from '../logic/activeSession';
import { formatKlok } from '../logic/format';
import { oefeningIcoon } from '../logic/icon';
import type { LogSet, Oefening } from '../schema';
import ExerciseCard from './training/ExerciseCard';
import FinishSheet, { type AfsluitGegevens } from './training/FinishSheet';
import GroupTimer from './training/GroupTimer';
import RestTimer from './training/RestTimer';

const t = nl.training;

type Picker = { soort: 'toevoegen' } | { soort: 'vervangen'; pos: Focus };

export default function TrainingScreen() {
  const navigate = useNavigate();
  const [sessie, setSessie] = useState<ActiveSession | null | undefined>(undefined);
  const huidig = useRef<ActiveSession | null>(null);
  const [vorige, setVorige] = useState<Record<string, LogSet[]>>({});
  const [picker, setPicker] = useState<Picker | null>(null);
  const [afsluiten, setAfsluiten] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const oefeningen = useLiveQuery(() => db.oefeningen.toArray(), []);
  const materiaal = useLiveQuery(() => db.materiaal.toArray(), []) ?? [];
  const perId = new Map((oefeningen ?? []).map((o) => [o.id, o]));
  const schermAan = useWakeLock(Boolean(sessie));
  const nu = useNow(1000);
  const progressie = useProgressie(sessie ? sessie.groepen.flatMap((g) => g.items.map((i) => i.oefeningId)) : [], sessie?.id);

  useEffect(() => {
    void leesActief().then(async (s) => {
      huidig.current = s ?? null;
      setSessie(s ?? null);
      if (s) setVorige(await vorigeSets(s.groepen.flatMap((g) => g.items.map((i) => i.oefeningId))));
    });
  }, []);

  const update = useCallback((fn: (s: ActiveSession) => ActiveSession) => {
    if (!huidig.current) return;
    const volgende = fn(huidig.current);
    huidig.current = volgende;
    setSessie(volgende);
    void bewaarActief(volgende);
  }, []);

  if (sessie === undefined) return null;
  if (sessie === null) {
    return (
      <section className="screen">
        <h1>{t.titel}</h1>
        <p className="muted">{t.geenSessie}</p>
        <Link to="/" className="btn btn-primary btn-block">
          {t.naarVandaag}
        </Link>
      </section>
    );
  }

  const kiesOefening = async (o: Oefening) => {
    const p = picker;
    setPicker(null);
    const v = (await vorigeSets([o.id]))[o.id];
    const voorstel = (await voorstellenVoor([o.id]))[o.id];
    setVorige((x) => ({ ...x, [o.id]: v }));
    if (p?.soort === 'vervangen') update((s) => vervangOefening(s, p.pos, o, v, voorstel));
    else update((s) => voegOefeningToe(s, o, v, voorstel));
  };

  const bewaar = async (g: AfsluitGegevens) => {
    const s = huidig.current!;
    const einde = new Date().toISOString();
    const gelogd = naarSessie(s, { einde, duurMin: g.duurMin, rpe: g.rpe, plezier: g.plezier, notitie: g.notitie });
    if (gelogd.oefeningen.length === 0) {
      if (!window.confirm(nl.afsluiten.geenSets)) return;
      await wisActief();
      return navigate('/');
    }
    await bewaarSessie(gelogd);
    if (s.planningId) await markeerGepland(s.planningId, gelogd.id, new Date(einde));
    if (g.sjabloonNaam) await db.sjablonen.put(naarSjabloon(s, g.sjabloonNaam));
    await wisActief();
    navigate(`/historiek/${encodeURIComponent(gelogd.id)}`, { replace: true });
  };

  const verwerp = async () => {
    if (!window.confirm(t.verwerpVraag)) return;
    await wisActief();
    navigate('/');
  };

  const verstreken = (nu - new Date(sessie.start).getTime()) / 1000;
  const allesKlaar = allesAfgewerkt(sessie);

  return (
    <section className={`screen training ${sessie.rust ? 'met-rust' : ''}`}>
      <div className="training-head">
        <h1 className="grow">{sessie.sjabloonNaam ?? t.titel}</h1>
        <span className="clock" title={schermAan ? t.schermAan : undefined}>
          {schermAan ? '☀ ' : ''}
          {formatKlok(verstreken)}
        </span>
      </div>

      {sessie.opwarming.length > 0 && (
        <details className="card">
          <summary>{t.opwarming}</summary>
          <ul>
            {sessie.opwarming.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </details>
      )}

      {sessie.groepen.map((g, gi) => (
        <div key={g.key} className={`group group-${g.type}`}>
          {(g.type !== 'enkel' || g.label) && (
            <div className="group-head">
              <strong>{g.label ?? gi + 1}</strong>
              <span className="muted">
                {nl.groepTypes[g.type]}
                {(g.type === 'superset' || g.type === 'circuit') && ` · ${t.rondes(g.rondes)}`}
              </span>
            </div>
          )}
          {g.notitie && <p className="small muted">{g.notitie}</p>}
          {(g.type === 'amrap' || g.type === 'emom') && (
            <GroupTimer
              groep={g}
              gestartOp={sessie.groepTimer?.groepKey === g.key ? sessie.groepTimer.gestartOp : undefined}
              onStart={() => update((s) => ({ ...s, groepTimer: { groepKey: g.key, gestartOp: Date.now() } }))}
              onStop={() => update((s) => ({ ...s, groepTimer: undefined }))}
            />
          )}
          {g.items.map((item, ii) => (
            <ExerciseCard
              key={item.key}
              item={item}
              groep={g}
              pos={{ groep: gi, item: ii }}
              focus={sessie.focus?.groep === gi && sessie.focus.item === ii}
              oefening={perId.get(item.oefeningId)}
              icoon={oefeningIcoon(perId.get(item.oefeningId), materiaal)}
              vandaag={vandaagTekst(progressie?.get(item.oefeningId)?.voorstel)}
              vorige={vorige[item.oefeningId]}
              update={update}
              onToggle={() => update((s) => wisselOpen(s, { groep: gi, item: ii }))}
              onInfo={() => setInfo(item.oefeningId)}
              onVervang={() => setPicker({ soort: 'vervangen', pos: { groep: gi, item: ii } })}
              onVerwijder={() => {
                if (window.confirm(t.verwijderVraag)) update((s) => verwijderOefening(s, { groep: gi, item: ii }));
              }}
            />
          ))}
        </div>
      ))}

      {allesKlaar && <p className="ok">{t.allesKlaar}</p>}

      <button className="btn btn-block" onClick={() => setPicker({ soort: 'toevoegen' })}>
        + {t.oefeningToevoegen}
      </button>
      <button className="btn btn-primary btn-block btn-big" onClick={() => setAfsluiten(true)}>
        {t.afsluiten}
      </button>
      <button className="btn btn-danger btn-block" onClick={() => void verwerp()}>
        {t.verwerpen}
      </button>

      {sessie.rust && (
        <RestTimer
          rust={sessie.rust}
          onWijzig={(eindigtOp) => update((s) => (s.rust ? { ...s, rust: { ...s.rust, eindigtOp } } : s))}
          onStop={() => update((s) => ({ ...s, rust: undefined }))}
        />
      )}
      {picker && (
        <ExercisePicker
          titel={picker.soort === 'vervangen' ? t.vervangen : t.oefeningToevoegen}
          onKies={(o) => void kiesOefening(o)}
          onSluit={() => setPicker(null)}
        />
      )}
      {info && (
        <ExerciseOverview
          oefeningId={info}
          kop={<span className="clock">{formatKlok(verstreken)}</span>}
          onSluit={() => setInfo(null)}
          onBewerk={() => navigate(`/oefeningen/${encodeURIComponent(info)}`)}
        />
      )}
      {afsluiten && <FinishSheet sessie={sessie} onBewaar={(g) => void bewaar(g)} onSluit={() => setAfsluiten(false)} />}
    </section>
  );
}

function vandaagTekst(v: Voorstel | undefined): { tekst: string; uitleg: string } | undefined {
  if (!v || v.type === 'geen') return undefined;
  const tekst = voorstelTekst(v);
  return tekst ? { tekst, uitleg: v.uitleg } : undefined;
}

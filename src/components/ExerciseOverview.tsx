import { useLiveQuery } from 'dexie-react-hooks';
import { Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react';
import { db } from '../db/db';
import { laatsteEntries, leesInstellingen } from '../db/repo';
import { useProgressie } from '../hooks/useProgressie';
import { nl } from '../i18n/nl';
import { formatDatum } from '../logic/format';
import { oefeningIcoon } from '../logic/icon';
import { setTekst } from '../ui/setText';
import ExerciseIcon from './ExerciseIcon';
import VoorstelBlok from './VoorstelBlok';

const ProgressCharts = lazy(() => import('./ProgressCharts'));

const t = nl.overzicht;
const VEEG_DREMPEL = 80;

/**
 * Overzichtspaneel van een oefening. Schuift omhoog over het scherm; wat eronder ligt (training,
 * klok, rusttimer) blijft gewoon lopen. Sluiten met de knop of door omlaag te vegen.
 */
export default function ExerciseOverview(props: {
  oefeningId: string;
  onSluit: () => void;
  onBewerk: () => void;
  /** Kopregel rechts, bv. de klok van de training. */
  kop?: ReactNode;
  /** Label van de trede waar je nu zit (uit de logs); anders die uit de oefening. */
  huidigeTrede?: string;
  /** Extra inhoud (voorstel, grafieken). */
  children?: ReactNode;
}) {
  const oefening = useLiveQuery(() => db.oefeningen.get(props.oefeningId), [props.oefeningId]);
  const materiaal = useLiveQuery(() => db.materiaal.toArray(), []) ?? [];
  const sessies = useLiveQuery(() => laatsteEntries(props.oefeningId, 3), [props.oefeningId]);
  const instellingen = useLiveQuery(() => leesInstellingen(), []);
  const info = useProgressie([props.oefeningId])?.get(props.oefeningId);
  const [veeg, setVeeg] = useState(0);
  const startY = useRef<number | null>(null);

  // Het scherm eronder mag niet mee scrollen; bij het sluiten sta je terug op dezelfde plek.
  useEffect(() => {
    const vorige = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = vorige;
    };
  }, []);

  const p = oefening?.progressie;
  const huidig = (props.huidigeTrede ?? info?.stand.trede?.label ?? p?.huidigeTrede)?.toLowerCase();
  const naam = oefening?.naam ?? nl.algemeen.onbekendeOefening;

  return (
    <div className="panel-backdrop" onClick={props.onSluit}>
      <div
        className="panel"
        role="dialog"
        aria-label={`${t.titel}: ${naam}`}
        style={veeg > 0 ? { transform: `translateY(${veeg}px)` } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="panel-head"
          onTouchStart={(e) => (startY.current = e.touches[0].clientY)}
          onTouchMove={(e) => startY.current !== null && setVeeg(Math.max(0, e.touches[0].clientY - startY.current))}
          onTouchEnd={() => {
            if (veeg > VEEG_DREMPEL) props.onSluit();
            startY.current = null;
            setVeeg(0);
          }}
        >
          <div className="panel-grip" aria-hidden="true" />
          <div className="panel-title">
            <ExerciseIcon icoon={oefeningIcoon(oefening, materiaal)} size={32} />
            <h2 className="grow">{naam}</h2>
            {props.kop}
            <button className="btn btn-small" onClick={props.onSluit} aria-label={nl.algemeen.sluiten}>
              ✕
            </button>
          </div>
        </div>

        <div className="panel-body">
          {props.children}

          {info && info.voorstel.type !== 'geen' && (
            <section>
              <h3>{t.voorstel}</h3>
              <VoorstelBlok voorstel={info.voorstel} />
            </section>
          )}

          {oefening && info && info.historiek.length > 0 && (
            <section>
              <h3>{t.verloop}</h3>
              <Suspense fallback={<p className="muted small">…</p>}>
                <ProgressCharts historiek={info.historiek} oefening={oefening} lichaamsgewichtKg={instellingen?.lichaamsgewichtKg} />
              </Suspense>
            </section>
          )}

          {p?.modus === 'ladder' && p.treden.length > 0 && (
            <section>
              <h3>{t.ladder}</h3>
              <ol className="ladder">
                {p.treden.map((tr) => {
                  const nu = tr.label.toLowerCase() === huidig;
                  return (
                    <li key={tr.label} className={nu ? 'current' : ''} aria-current={nu ? 'step' : undefined}>
                      <span className="grow">{tr.label}</span>
                      {nu && <span>{t.hier}</span>}
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          <Lijst titel={t.cues} items={oefening?.cues} />
          <Lijst titel={t.valkuilen} items={oefening?.valkuilen} />
          {oefening?.notities && (
            <section>
              <h3>{t.notities}</h3>
              <p className="note">{oefening.notities}</p>
            </section>
          )}
          {oefening && oefening.videolinks.length > 0 && (
            <section>
              <h3>{t.videos}</h3>
              <ul className="plain">
                {oefening.videolinks.map((v) => (
                  <li key={v}>
                    <a href={v} target="_blank" rel="noreferrer">
                      {v.replace(/^https?:\/\/(www\.)?/, '')}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {oefening && (oefening.spieren.primair.length > 0 || oefening.spieren.secundair.length > 0) && (
            <section>
              <h3>{t.spieren}</h3>
              <p>
                {oefening.spieren.primair.join(', ')}
                {oefening.spieren.secundair.length > 0 && (
                  <span className="muted">
                    {oefening.spieren.primair.length > 0 ? ' · ' : ''}
                    {oefening.spieren.secundair.join(', ')}
                  </span>
                )}
              </p>
            </section>
          )}

          <section>
            <h3>{t.laatsteSessies}</h3>
            {sessies && sessies.length === 0 && <p className="muted">{nl.oefening.nooitGedaan}</p>}
            {sessies?.map((e) => (
              <div key={e.id} className="history-entry">
                <strong className="small">{formatDatum(e.start)}</strong>
                <ol className="set-list compact">
                  {e.sets.map((s, i) => (
                    <li key={i} className={s.opwarm ? 'muted' : ''}>
                      {s.opwarm ? `${nl.history.opwarm}: ` : ''}
                      {setTekst(s) || '—'}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </section>

          {oefening && (
            <button className="btn btn-block" onClick={props.onBewerk}>
              {nl.algemeen.bewerken}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Lijst({ titel, items }: { titel: string; items: string[] | undefined }) {
  if (!items || items.length === 0) return null;
  return (
    <section>
      <h3>{titel}</h3>
      <ul>
        {items.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    </section>
  );
}

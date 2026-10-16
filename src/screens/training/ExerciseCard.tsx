import { useEffect, useRef, useState } from 'react';
import ExerciseIcon from '../../components/ExerciseIcon';
import { nl } from '../../i18n/nl';
import {
  setKlaar,
  updateItem,
  updateSet,
  verwijderSet,
  voegOpwarmsetToe,
  voegSetToe,
  volgendeSet,
  type ActiveGroup,
  type ActiveItem,
  type ActiveSession,
  type Focus,
} from '../../logic/activeSession';
import type { Icoon, LogSet, Oefening } from '../../schema';
import { ontgrendelGeluid } from '../../ui/feedback';
import { doelTekst, setTekst } from '../../ui/setText';
import SetEditor from './SetEditor';

const t = nl.training;

export default function ExerciseCard(props: {
  item: ActiveItem;
  groep: ActiveGroup;
  pos: Focus;
  focus: boolean;
  oefening: Oefening | undefined;
  icoon: Icoon;
  vorige: LogSet[] | undefined;
  update: (fn: (s: ActiveSession) => ActiveSession) => void;
  onFocus: () => void;
  onVervang: () => void;
  onVerwijder: () => void;
}) {
  const { item, groep, pos, focus, oefening, update } = props;
  const volgende = volgendeSet(item);
  const [gekozen, setGekozen] = useState<number | null>(null);
  const [notitieOpen, setNotitieOpen] = useState(Boolean(item.notitie));
  const ref = useRef<HTMLDivElement>(null);
  const actief = gekozen ?? (volgende >= 0 ? volgende : null);

  useEffect(() => {
    if (focus) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setGekozen(null);
  }, [focus]);

  const klaar = item.sets.filter((s) => s.klaar && !s.opwarm).length;
  const werk = item.sets.filter((s) => !s.opwarm).length;
  const doel = doelTekst(item.doel, oefening);
  const vorigeTekst = props.vorige?.filter((s) => !s.opwarm).map(setTekst).join('  |  ');
  let werkNr = 0;
  let opwarmNr = 0;

  return (
    <div ref={ref} className={`card exercise-card ${focus ? 'focus' : ''}`}>
      <button className="exercise-head" onClick={props.onFocus} aria-expanded={focus}>
        <ExerciseIcon icoon={props.icoon} />
        <span className="grow">
          <strong>{oefening?.naam ?? nl.algemeen.onbekendeOefening}</strong>
          {doel && <small className="muted"> · {doel}</small>}
        </span>
        <span className="badge">
          {klaar}/{werk}
        </span>
      </button>
      {item.doel.notitie && <p className="small muted">{item.doel.notitie}</p>}

      {focus && (
        <>
          {vorigeTekst && (
            <p className="small muted">
              {t.vorige}: {vorigeTekst}
            </p>
          )}
          <ol className="set-list">
            {item.sets.map((s, i) => {
              const nr = s.opwarm ? `${t.opwarmKort} ${++opwarmNr}` : groep.type === 'enkel' ? `${++werkNr}` : `R${s.ronde ?? ++werkNr}`;
              const open = i === actief;
              return (
                <li key={i} className={`${s.klaar ? 'done' : ''} ${open ? 'open' : ''}`}>
                  {!open && (
                    <button className="set-row" onClick={() => setGekozen(i)}>
                      <span className="set-nr">{nr}</span>
                      <span className="grow">{setTekst(s) || '—'}</span>
                      <span>{s.klaar ? '✓' : ''}</span>
                    </button>
                  )}
                  {open && (
                    <>
                      <div className="set-row set-row-open">
                        <span className="set-nr">{nr}</span>
                        <span className="grow">{s.opwarm ? t.opwarmset : groep.type === 'enkel' ? `${t.set} ${werkNr}` : `${t.ronde} ${s.ronde ?? ''}`}</span>
                      </div>
                      <SetEditor
                        set={s}
                        oefening={oefening}
                        onChange={(patch) => update((x) => updateSet(x, pos, i, patch))}
                        onVerwijder={() => {
                          setGekozen(null);
                          update((x) => verwijderSet(x, pos, i));
                        }}
                        onKlaar={() => {
                          ontgrendelGeluid();
                          setGekozen(null);
                          if (s.klaar) return;
                          update((x) => setKlaar(x, pos, i));
                        }}
                      />
                    </>
                  )}
                </li>
              );
            })}
          </ol>
          <div className="row wrap">
            <button className="btn btn-small" onClick={() => update((x) => voegSetToe(x, pos))}>
              {t.extraSet}
            </button>
            <button className="btn btn-small" onClick={() => update((x) => voegOpwarmsetToe(x, pos))}>
              {t.extraOpwarmset}
            </button>
            <button className="btn btn-small" onClick={() => setNotitieOpen((o) => !o)}>
              {nl.afsluiten.notitie}
            </button>
            <button className="btn btn-small" onClick={props.onVervang}>
              {t.vervangen}
            </button>
            <button className="btn btn-small" onClick={props.onVerwijder}>
              {t.verwijderen}
            </button>
          </div>
          {notitieOpen && (
            <label className="field">
              <span>{t.notitie}</span>
              <textarea
                rows={2}
                value={item.notitie ?? ''}
                onChange={(e) => update((x) => updateItem(x, pos, (it) => ({ ...it, notitie: e.target.value || undefined })))}
              />
            </label>
          )}
        </>
      )}
    </div>
  );
}

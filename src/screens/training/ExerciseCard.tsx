import { useEffect, useRef, useState } from 'react';
import ExerciseIcon from '../../components/ExerciseIcon';
import { nl } from '../../i18n/nl';
import {
  itemVoortgang,
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

/**
 * Eén oefening in de training, als accordeonkaart.
 * Dicht: icoon, naam, voortgang en de laatste set. Open: de sets, alleen de huidige set met invoer.
 * Tik op het icoon of de naam opent het overzichtspaneel; tik op de rest klapt de kaart open of dicht.
 */
export default function ExerciseCard(props: {
  item: ActiveItem;
  groep: ActiveGroup;
  pos: Focus;
  focus: boolean;
  oefening: Oefening | undefined;
  icoon: Icoon;
  vorige: LogSet[] | undefined;
  /** Doel van vandaag (voorstel), als er een is. */
  vandaag?: { tekst: string; uitleg: string };
  update: (fn: (s: ActiveSession) => ActiveSession) => void;
  onToggle: () => void;
  onInfo: () => void;
  onVervang: () => void;
  onVerwijder: () => void;
}) {
  const { item, groep, pos, focus, oefening, update } = props;
  const volgende = volgendeSet(item);
  const [gekozen, setGekozen] = useState<number | null>(null);
  const [notitieOpen, setNotitieOpen] = useState(Boolean(item.notitie));
  const [opwarmOpen, setOpwarmOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const actief = gekozen ?? (volgende >= 0 ? volgende : null);

  useEffect(() => {
    if (focus) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setGekozen(null);
  }, [focus]);

  const voortgang = itemVoortgang(item);
  const doel = doelTekst(item.doel, oefening);
  const vorigeTekst = props.vorige?.filter((s) => !s.opwarm).map(setTekst).join('  |  ');
  const naam = oefening?.naam ?? nl.algemeen.onbekendeOefening;
  const opwarmSets = item.sets.filter((s) => s.opwarm);
  // Afgewerkte opwarmsets klappen samen tot één regel (tenzij je er een wil aanpassen).
  const opwarmIngeklapt =
    opwarmSets.length > 0 && opwarmSets.every((s) => s.klaar) && !opwarmOpen && !(actief !== null && item.sets[actief]?.opwarm);
  const samenvatting = voortgang.laatste ? setTekst(voortgang.laatste) : doel;
  let werkNr = 0;
  let opwarmNr = 0;

  return (
    <div
      ref={ref}
      className={`card exercise-card ${focus ? 'open' : ''} ${voortgang.afgewerkt ? 'done' : ''}`}
      data-testid="exercise-card"
    >
      <div className="exercise-head">
        <button className="exercise-name" onClick={props.onInfo} aria-label={`${t.overzicht}: ${naam}`}>
          <ExerciseIcon icoon={props.icoon} />
          <strong>{naam}</strong>
          {item.vervangen && <span className="muted small">{t.vervangenLabel}</span>}
        </button>
        <button
          className="exercise-toggle"
          onClick={props.onToggle}
          aria-expanded={focus}
          aria-label={focus ? t.dichtklappen(naam) : t.openklappen(naam)}
        >
          <span className="badge">
            {voortgang.afgewerkt ? '✓ ' : ''}
            {voortgang.klaar}/{voortgang.totaal}
          </span>
          <span className="chevron" aria-hidden="true">
            {focus ? '⌃' : '⌄'}
          </span>
        </button>
      </div>
      {!focus && samenvatting && (
        <button className="exercise-sub" onClick={props.onToggle}>
          {samenvatting}
        </button>
      )}

      {focus && (
        <div className="exercise-body">
          {(doel || props.vandaag) && (
            <p className="small">
              {props.vandaag ? (
                <>
                  <strong>
                    {t.vandaag}: {props.vandaag.tekst}
                  </strong>
                  <br />
                  <span className="muted">{props.vandaag.uitleg}</span>
                </>
              ) : (
                <span className="muted">
                  {t.doel}: {doel}
                </span>
              )}
            </p>
          )}
          {item.doel.notitie && <p className="small muted">{item.doel.notitie}</p>}
          {vorigeTekst && (
            <p className="small muted">
              {t.vorige}: {vorigeTekst}
            </p>
          )}
          <ol className="set-list">
            {opwarmIngeklapt && (
              <li className="done">
                <button className="set-row" onClick={() => setOpwarmOpen(true)} aria-expanded={false}>
                  <span className="set-nr">{t.opwarmKort}</span>
                  <span className="grow">{t.opwarmsetsKlaar(opwarmSets.length)}</span>
                  <span>✓</span>
                </button>
              </li>
            )}
            {item.sets.map((s, i) => {
              const nr = s.opwarm ? `${t.opwarmKort} ${++opwarmNr}` : groep.type === 'enkel' ? `${++werkNr}` : `R${s.ronde ?? ++werkNr}`;
              if (s.opwarm && opwarmIngeklapt) return null;
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
                        <span className="grow">
                          {s.opwarm ? t.opwarmset : groep.type === 'enkel' ? `${t.set} ${werkNr}` : `${t.ronde} ${s.ronde ?? ''}`}
                        </span>
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
          {opwarmSets.length > 0 && !opwarmIngeklapt && opwarmSets.every((s) => s.klaar) && (
            <button className="btn btn-small" onClick={() => setOpwarmOpen(false)}>
              {t.opwarmInklappen}
            </button>
          )}
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
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Checkbox, Field, NumberInput, Segmented, TextField } from '../../components/form';
import { nl } from '../../i18n/nl';
import { formatDatum, minutenTussen } from '../../logic/format';
import { vrijeSjabloonNaam, type ActiveSession } from '../../logic/activeSession';
import { normaliseer } from '../../logic/matching';
import type { Sjabloon } from '../../schema';

const t = nl.afsluiten;

export interface AfsluitGegevens {
  duurMin: number | undefined;
  rpe: number | undefined;
  plezier: number | undefined;
  notitie: string;
  sjabloonNaam: string | null;
  /** Bestaand sjabloon met dezelfde naam dat bewust vervangen wordt. */
  vervangSjabloonId?: string;
}

export default function FinishSheet(props: {
  sessie: ActiveSession;
  sjablonen: Pick<Sjabloon, 'id' | 'naam'>[];
  onBewaar: (g: AfsluitGegevens) => void;
  onSluit: () => void;
}) {
  const [duurMin, setDuurMin] = useState<number | undefined>(minutenTussen(props.sessie.start, new Date().toISOString()));
  const [rpe, setRpe] = useState<number | undefined>();
  const [plezier, setPlezier] = useState<number | undefined>();
  const [notitie, setNotitie] = useState('');
  const [alsSjabloon, setAlsSjabloon] = useState(false);
  const bestaandeNamen = props.sjablonen.map((x) => x.naam);
  // Een naam die al bestaat wordt nooit stil gedupliceerd: standaard een vrije naam, bv. "Sessie A (aangepast)".
  const [naam, setNaam] = useState(() =>
    vrijeSjabloonNaam(props.sessie.sjabloonNaam ?? t.standaardNaam(formatDatum(props.sessie.start)), bestaandeNamen),
  );
  const [vervangen, setVervangen] = useState(false);
  const botsing = props.sjablonen.find((x) => normaliseer(x.naam) === normaliseer(naam));
  const vrij = vrijeSjabloonNaam(naam, bestaandeNamen);
  const bewaar = () => {
    if (!alsSjabloon) return props.onBewaar({ duurMin, rpe, plezier, notitie, sjabloonNaam: null });
    if (botsing && vervangen) return props.onBewaar({ duurMin, rpe, plezier, notitie, sjabloonNaam: naam, vervangSjabloonId: botsing.id });
    props.onBewaar({ duurMin, rpe, plezier, notitie, sjabloonNaam: botsing ? vrij : naam });
  };

  return (
    <div className="sheet" role="dialog" aria-label={t.titel}>
      <div className="sheet-head">
        <h2>{t.titel}</h2>
        <button className="btn" onClick={props.onSluit}>
          {nl.algemeen.terug}
        </button>
      </div>
      <Field label={t.duur}>
        <NumberInput value={duurMin} onChange={setDuurMin} integer />
      </Field>
      <div className="field">
        <span>{t.rpe}</span>
        <Segmented
          value={rpe}
          allowNone
          onChange={setRpe}
          className="big wrap"
          options={Array.from({ length: 10 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))}
        />
      </div>
      <div className="field">
        <span>{t.plezier}</span>
        <Segmented
          value={plezier}
          allowNone
          onChange={setPlezier}
          className="big stars"
          options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: `${n} ★` }))}
        />
      </div>
      <label className="field">
        <span>{t.notitie}</span>
        <textarea rows={3} value={notitie} onChange={(e) => setNotitie(e.target.value)} />
      </label>
      <Checkbox label={t.alsSjabloon} checked={alsSjabloon} onChange={setAlsSjabloon} />
      {alsSjabloon && <TextField label={t.sjabloonNaam} value={naam} onChange={setNaam} />}
      {alsSjabloon && botsing && (
        <fieldset className="choice-group">
          <legend className="warn">{t.naamBestaat}</legend>
          <label className="radio">
            <input type="radio" name="sjabloon-botsing" checked={!vervangen} onChange={() => setVervangen(false)} />
            {t.alsNieuw(vrij)}
          </label>
          <label className="radio">
            <input type="radio" name="sjabloon-botsing" checked={vervangen} onChange={() => setVervangen(true)} />
            {t.vervangBestaand(botsing.naam)}
          </label>
        </fieldset>
      )}
      <button className="btn btn-primary btn-block btn-big" disabled={alsSjabloon && !naam.trim()} onClick={bewaar}>
        {t.bewaren}
      </button>
    </div>
  );
}

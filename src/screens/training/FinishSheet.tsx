import { useState } from 'react';
import { Checkbox, Field, NumberInput, Segmented, TextField } from '../../components/form';
import { nl } from '../../i18n/nl';
import { formatDatum, minutenTussen } from '../../logic/format';
import type { ActiveSession } from '../../logic/activeSession';

const t = nl.afsluiten;

export interface AfsluitGegevens {
  duurMin: number | undefined;
  rpe: number | undefined;
  plezier: number | undefined;
  notitie: string;
  sjabloonNaam: string | null;
}

export default function FinishSheet(props: { sessie: ActiveSession; onBewaar: (g: AfsluitGegevens) => void; onSluit: () => void }) {
  const [duurMin, setDuurMin] = useState<number | undefined>(minutenTussen(props.sessie.start, new Date().toISOString()));
  const [rpe, setRpe] = useState<number | undefined>();
  const [plezier, setPlezier] = useState<number | undefined>();
  const [notitie, setNotitie] = useState('');
  const [alsSjabloon, setAlsSjabloon] = useState(false);
  const [naam, setNaam] = useState(props.sessie.sjabloonNaam ?? t.standaardNaam(formatDatum(props.sessie.start)));

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
      <button
        className="btn btn-primary btn-block btn-big"
        disabled={alsSjabloon && !naam.trim()}
        onClick={() => props.onBewaar({ duurMin, rpe, plezier, notitie, sjabloonNaam: alsSjabloon ? naam : null })}
      >
        {t.bewaren}
      </button>
    </div>
  );
}

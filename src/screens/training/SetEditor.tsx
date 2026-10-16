import { Segmented, TextField } from '../../components/form';
import Stepper from '../../components/Stepper';
import { nl } from '../../i18n/nl';
import type { DraftSet } from '../../logic/activeSession';
import type { Kwaliteit, Oefening } from '../../schema';

const t = nl.training;
const RIR_OPTIES = [0, 1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }));
const KWALITEIT_OPTIES = (['makkelijk', 'controle', 'gevecht'] as Kwaliteit[]).map((k) => ({
  value: k,
  label: t.kwaliteiten[k],
}));

export default function SetEditor(props: {
  set: DraftSet;
  oefening: Oefening | undefined;
  onChange: (patch: Partial<DraftSet>) => void;
  onKlaar: () => void;
  onVerwijder: () => void;
}) {
  const { set, oefening, onChange } = props;
  const metingen = oefening?.metingen ?? ['gewicht', 'reps'];
  const treden = oefening?.progressie?.modus === 'ladder' ? oefening.progressie.treden : [];

  const kiesTrede = (label: string) => {
    const trede = treden.find((x) => x.label === label);
    if (!trede) return onChange({ trede: undefined });
    onChange({
      trede: trede.label,
      gewichtKg: trede.last.gewichtKg ?? set.gewichtKg,
      extraKg: trede.last.extraKg ?? (metingen.includes('extraLast') ? 0 : set.extraKg),
      variant: trede.last.variant,
      tempo: trede.last.tempo,
    });
  };

  return (
    <div className={`set-editor ${set.opwarm ? 'opwarm' : ''}`}>
      {treden.length > 0 && (
        <label className="field">
          <span>{t.trede}</span>
          <select value={set.trede ?? ''} onChange={(e) => kiesTrede(e.target.value)}>
            <option value="">{nl.algemeen.geen}</option>
            {treden.map((tr) => (
              <option key={tr.label} value={tr.label}>
                {tr.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {treden.length === 0 && metingen.includes('variant') && (
        <TextField label={t.variant} value={set.variant} onChange={(v) => onChange({ variant: v || undefined })} />
      )}
      <div className="stepper-grid">
        {metingen.includes('gewicht') && (
          <Stepper label={nl.metingen.gewicht} unit="kg" step={2.5} value={set.gewichtKg} onChange={(gewichtKg) => onChange({ gewichtKg })} />
        )}
        {metingen.includes('extraLast') && (
          <Stepper label={nl.metingen.extraLast} unit="kg" step={2.5} value={set.extraKg} onChange={(extraKg) => onChange({ extraKg })} />
        )}
        {metingen.includes('reps') &&
          (oefening?.unilateraal ? (
            <>
              <Stepper label={t.links} unit={t.reps} step={1} integer value={set.repsLinks} onChange={(repsLinks) => onChange({ repsLinks })} />
              <Stepper label={t.rechts} unit={t.reps} step={1} integer value={set.repsRechts} onChange={(repsRechts) => onChange({ repsRechts })} />
            </>
          ) : (
            <Stepper label={nl.metingen.reps} step={1} integer value={set.reps} onChange={(reps) => onChange({ reps })} />
          ))}
        {metingen.includes('tijd') && (
          <Stepper label={nl.metingen.tijd} unit="s" step={5} value={set.duurSec} onChange={(duurSec) => onChange({ duurSec })} />
        )}
        {metingen.includes('afstand') && (
          <Stepper label={nl.metingen.afstand} unit="m" step={5} value={set.afstandM} onChange={(afstandM) => onChange({ afstandM })} />
        )}
      </div>
      {!set.opwarm && (
        <>
          <div className="field">
            <span>{t.rir}</span>
            <Segmented value={set.rir} options={RIR_OPTIES} allowNone onChange={(rir) => onChange({ rir })} ariaLabel={t.rir} className="big" />
          </div>
          <div className="field">
            <span>{t.kwaliteit}</span>
            <Segmented
              value={set.kwaliteit}
              options={KWALITEIT_OPTIES}
              allowNone
              onChange={(kwaliteit) => onChange({ kwaliteit })}
              ariaLabel={t.kwaliteit}
              className="big"
            />
          </div>
        </>
      )}
      <div className="row">
        <button type="button" className="btn btn-small" onClick={props.onVerwijder}>
          {t.setVerwijderen}
        </button>
        <button type="button" className="btn btn-primary btn-big grow" onClick={props.onKlaar}>
          {set.klaar ? '✓' : t.setKlaar}
        </button>
      </div>
    </div>
  );
}

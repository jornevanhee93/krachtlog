import { useEffect, useRef } from 'react';
import { useNow } from '../../hooks/useNow';
import { nl } from '../../i18n/nl';
import type { ActiveGroup } from '../../logic/activeSession';
import { formatKlok } from '../../logic/format';
import { ontgrendelGeluid, piep, signaal } from '../../ui/feedback';

const t = nl.training;

/** Timer voor een AMRAP (aftellen) of EMOM (piep bij elk interval). */
export default function GroupTimer(props: { groep: ActiveGroup; gestartOp: number | undefined; onStart: () => void; onStop: () => void }) {
  const { groep, gestartOp } = props;
  const nu = useNow(250);
  const vorigInterval = useRef(-1);
  const klaarGemeld = useRef(false);
  const duur = groep.duurSec ?? 0;
  const interval = groep.intervalSec || 60;
  const verstreken = gestartOp ? (nu - gestartOp) / 1000 : 0;
  const om = gestartOp !== undefined && duur > 0 && verstreken >= duur;
  const minuut = Math.floor(verstreken / interval);

  useEffect(() => {
    if (!gestartOp) {
      vorigInterval.current = -1;
      klaarGemeld.current = false;
      return;
    }
    if (om && !klaarGemeld.current) {
      klaarGemeld.current = true;
      signaal();
      return;
    }
    if (groep.type === 'emom' && !om && minuut !== vorigInterval.current) {
      if (vorigInterval.current >= 0) piep(1, 1040);
      vorigInterval.current = minuut;
    }
  }, [gestartOp, om, minuut, groep.type]);

  if (!gestartOp) {
    return (
      <button
        className="btn btn-primary btn-block"
        onClick={() => {
          ontgrendelGeluid();
          props.onStart();
        }}
      >
        {t.groepTimerStart} {duur ? `(${formatKlok(duur)})` : ''}
      </button>
    );
  }
  return (
    <div className={`group-timer ${om ? 'over' : ''}`}>
      <strong>{om ? t.tijdOm : formatKlok(duur ? duur - verstreken : verstreken)}</strong>
      {groep.type === 'emom' && !om && (
        <span>
          {t.ronde} {minuut + 1}
          {duur ? `/${Math.ceil(duur / interval)}` : ''} · {formatKlok(interval - (verstreken % interval))}
        </span>
      )}
      <button className="btn btn-small" onClick={props.onStop}>
        {t.groepTimerStop}
      </button>
    </div>
  );
}

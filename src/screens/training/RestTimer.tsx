import { useEffect, useRef, useState } from 'react';
import { useNow } from '../../hooks/useNow';
import { nl } from '../../i18n/nl';
import { formatKlok } from '../../logic/format';
import { signaal } from '../../ui/feedback';

const t = nl.training;

/** De rusttimer onderaan. Bij nul: trillen en piepen. */
export default function RestTimer(props: {
  rust: { eindigtOp: number; duurSec: number };
  onWijzig: (eindigtOp: number) => void;
  onStop: () => void;
}) {
  const nu = useNow(250);
  const gesignaleerd = useRef<number | null>(null);
  const [voorbij, setVoorbij] = useState(false);
  const rest = (props.rust.eindigtOp - nu) / 1000;

  const stop = useRef(props.onStop);
  useEffect(() => {
    stop.current = props.onStop;
  });

  useEffect(() => {
    if (rest <= 0 && gesignaleerd.current !== props.rust.eindigtOp) {
      gesignaleerd.current = props.rust.eindigtOp;
      signaal();
      setVoorbij(true);
    } else if (rest > 0) {
      setVoorbij(false);
    }
  }, [rest, props.rust.eindigtOp]);

  // Na het signaal verdwijnt de balk vanzelf.
  useEffect(() => {
    if (!voorbij) return;
    const id = setTimeout(() => stop.current(), 4000);
    return () => clearTimeout(id);
  }, [voorbij]);

  const pct = Math.max(0, Math.min(100, (rest / props.rust.duurSec) * 100));

  return (
    <div className={`rest-bar ${voorbij ? 'over' : ''}`} role="timer" aria-live="polite">
      <div className="rest-progress" style={{ width: `${pct}%` }} />
      <div className="rest-content">
        <button className="btn btn-small" onClick={() => props.onWijzig(props.rust.eindigtOp - 15_000)}>
          −15
        </button>
        <div className="grow rest-time">
          <small>{voorbij ? t.rustKlaar : t.rust}</small>
          <strong>{formatKlok(rest)}</strong>
        </div>
        <button className="btn btn-small" onClick={() => props.onWijzig(props.rust.eindigtOp + 15_000)}>
          +15
        </button>
        <button className="btn btn-small" onClick={props.onStop}>
          {t.rustOverslaan}
        </button>
      </div>
    </div>
  );
}

import { NumberInput } from './form';

/** Groot getal met − en + knoppen; tik op het getal om het te typen. */
export default function Stepper(props: {
  label: string;
  value: number | undefined;
  step: number;
  onChange: (v: number) => void;
  unit?: string;
  integer?: boolean;
}) {
  const v = props.value ?? 0;
  const afronden = (n: number) => Math.max(0, Math.round(n * 100) / 100);
  return (
    <div className="stepper">
      <span className="stepper-label">
        {props.label}
        {props.unit && <small> ({props.unit})</small>}
      </span>
      <div className="stepper-row">
        <button type="button" className="step-btn" aria-label={`${props.label} min ${props.step}`} onClick={() => props.onChange(afronden(v - props.step))}>
          −
        </button>
        <NumberInput
          className="stepper-value"
          ariaLabel={props.label}
          value={props.value}
          integer={props.integer}
          onChange={(n) => props.onChange(afronden(n ?? 0))}
        />
        <button type="button" className="step-btn" aria-label={`${props.label} plus ${props.step}`} onClick={() => props.onChange(afronden(v + props.step))}>
          +
        </button>
      </div>
    </div>
  );
}

import { useEffect, useState, type ReactNode } from 'react';
import { nl } from '../i18n/nl';
import { formatGetal } from '../logic/format';

export function Field({ label, hint, fout, children }: { label: string; hint?: string; fout?: string; children: ReactNode }) {
  return (
    <label className={fout ? 'field field-fout' : 'field'}>
      <span>
        {label}
        {hint && <small className="muted"> ({hint})</small>}
      </span>
      {children}
      {fout && (
        <small className="field-melding" role="alert">
          {fout}
        </small>
      )}
    </label>
  );
}

export function TextField(props: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  hint?: string;
  placeholder?: string;
  autoFocus?: boolean;
  fout?: string;
}) {
  return (
    <Field label={props.label} hint={props.hint} fout={props.fout}>
      <input
        type="text"
        aria-invalid={props.fout ? true : undefined}
        value={props.value ?? ''}
        placeholder={props.placeholder}
        autoFocus={props.autoFocus}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </Field>
  );
}

export function TextArea(props: { label: string; value: string | undefined; onChange: (v: string) => void; rows?: number; hint?: string }) {
  return (
    <Field label={props.label} hint={props.hint}>
      <textarea rows={props.rows ?? 3} value={props.value ?? ''} onChange={(e) => props.onChange(e.target.value)} />
    </Field>
  );
}

/** Een lijst als tekstvak met één item per regel. */
export function ListField(props: { label: string; value: string[]; onChange: (v: string[]) => void; hint?: string; rows?: number }) {
  const [tekst, setTekst] = useState(props.value.join('\n'));
  useEffect(() => {
    if (tekst.split('\n').map((x) => x.trim()).filter(Boolean).join('\n') !== props.value.join('\n')) {
      setTekst(props.value.join('\n'));
    }
  }, [props.value]);
  return (
    <Field label={props.label} hint={props.hint ?? nl.algemeen.eenPerRegel}>
      <textarea
        rows={props.rows ?? Math.max(2, props.value.length + 1)}
        value={tekst}
        onChange={(e) => {
          setTekst(e.target.value);
          props.onChange(e.target.value.split('\n').map((x) => x.trim()).filter(Boolean));
        }}
      />
    </Field>
  );
}

/** Getal met komma of punt; leeg = undefined. */
export function NumberInput(props: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  ariaLabel?: string;
  integer?: boolean;
  className?: string;
}) {
  const [tekst, setTekst] = useState(props.value === undefined ? '' : formatGetal(props.value));
  useEffect(() => {
    const huidig = parseGetal(tekst);
    if (huidig !== props.value) setTekst(props.value === undefined ? '' : formatGetal(props.value));
  }, [props.value]);
  return (
    <input
      type="text"
      inputMode={props.integer ? 'numeric' : 'decimal'}
      aria-label={props.ariaLabel}
      className={props.className}
      value={tekst}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        setTekst(e.target.value);
        const n = parseGetal(e.target.value);
        if (n !== null) props.onChange(n);
      }}
    />
  );
}

/** "2,5" → 2.5; leeg → undefined; ongeldig → null. */
export function parseGetal(tekst: string): number | undefined | null {
  const t = tekst.trim().replace(',', '.');
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function NumberField(props: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  hint?: string;
  integer?: boolean;
}) {
  return (
    <Field label={props.label} hint={props.hint}>
      <NumberInput value={props.value} onChange={props.onChange} integer={props.integer} />
    </Field>
  );
}

export function RangeField(props: {
  label: string;
  value: { min: number; max: number } | undefined;
  onChange: (v: { min: number; max: number } | undefined) => void;
}) {
  const v = props.value;
  const zet = (min: number | undefined, max: number | undefined) => {
    if (min === undefined && max === undefined) props.onChange(undefined);
    else props.onChange({ min: min ?? max ?? 0, max: max ?? min ?? 0 });
  };
  return (
    <Field label={props.label}>
      <div className="range">
        <NumberInput value={v?.min} onChange={(n) => zet(n, v?.max)} ariaLabel="min" integer />
        <span>–</span>
        <NumberInput value={v?.max} onChange={(n) => zet(v?.min, n)} ariaLabel="max" integer />
      </div>
    </Field>
  );
}

export function Select<T extends string>(props: {
  label: string;
  value: T | undefined;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <Field label={props.label}>
      <select value={props.value ?? ''} onChange={(e) => props.onChange(e.target.value as T)}>
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Checkbox(props: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="checkbox">
      <input type="checkbox" checked={props.checked} onChange={(e) => props.onChange(e.target.checked)} />
      <span>{props.label}</span>
    </label>
  );
}

/** Rij knoppen waarvan er één (of geen) gekozen is. */
export function Segmented<T extends string | number>(props: {
  value: T | undefined;
  options: { value: T; label: string }[];
  onChange: (v: T | undefined) => void;
  allowNone?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div className={`segmented ${props.className ?? ''}`} role="group" aria-label={props.ariaLabel}>
      {props.options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          className={o.value === props.value ? 'active' : ''}
          aria-pressed={o.value === props.value}
          onClick={() => props.onChange(props.allowNone && o.value === props.value ? undefined : o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Meerdere keuzes als aan/uit-chips. */
export function Chips<T extends string>(props: {
  value: T[];
  options: { value: T; label: string }[];
  onChange: (v: T[]) => void;
}) {
  return (
    <div className="chips">
      {props.options.map((o) => {
        const aan = props.value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            className={aan ? 'chip active' : 'chip'}
            aria-pressed={aan}
            onClick={() => props.onChange(aan ? props.value.filter((x) => x !== o.value) : [...props.value, o.value])}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Fouten({ fouten }: { fouten: { pad: string; bericht: string }[] }) {
  if (fouten.length === 0) return null;
  return (
    <div className="errors" role="alert">
      <ul>
        {fouten.map((f, i) => (
          <li key={i}>
            {f.pad && <code>{f.pad}</code>} {f.bericht}
          </li>
        ))}
      </ul>
    </div>
  );
}

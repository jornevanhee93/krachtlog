import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Field, Fouten, ListField, NumberField, Select, TextArea, TextField } from '../../components/form';
import { db } from '../../db/db';
import { nl } from '../../i18n/nl';
import { formatGetal } from '../../logic/format';
import { nieuwId } from '../../logic/ids';
import { valideer, type Fout } from '../../logic/parseFile';
import { materiaal as materiaalSchema, materiaalSoort, type Materiaal } from '../../schema';

const t = nl.materiaal;
type Gewichten = NonNullable<Materiaal['gewichten']>;
const TYPES = ['geen', 'vast', 'schijven', 'instelbaar', 'standen'] as const;

function leegGewicht(type: (typeof TYPES)[number]): Gewichten | undefined {
  switch (type) {
    case 'geen':
      return undefined;
    case 'vast':
      return { type, kg: [] };
    case 'schijven':
      return { type, stangKg: 20, schijven: [] };
    case 'instelbaar':
      return { type, minKg: 0, maxKg: 20, stapKg: 2.5 };
    case 'standen':
      return { type, standen: [] };
  }
}

function getallen(tekst: string): number[] {
  return tekst
    .split(/[\s;]+/)
    .map((x) => Number(x.replace(',', '.')))
    .filter((n) => Number.isFinite(n) && n > 0);
}

/** "10 x 2" per regel → { kg: 10, aantal: 2 }; zonder aantal: 2 stuks. */
function parseSchijven(tekst: string) {
  return tekst
    .split('\n')
    .map((r) => r.split(/[x×*]/i).map((x) => Number(x.trim().replace(',', '.'))))
    .filter(([kg]) => Number.isFinite(kg) && kg > 0)
    .map(([kg, n]) => ({ kg, aantal: Number.isInteger(n) && n >= 0 ? n : 2 }));
}

export default function EquipmentEdit() {
  const { id = 'nieuw' } = useParams();
  const nieuw = id === 'nieuw';
  const navigate = useNavigate();
  const [m, setM] = useState<Materiaal | null>(nieuw ? { id: nieuwId('mat'), naam: '', soort: 'dumbbell' } : null);
  const [fouten, setFouten] = useState<Fout[]>([]);
  const [vastTekst, setVastTekst] = useState('');
  const [schijvenTekst, setSchijvenTekst] = useState('');

  useEffect(() => {
    if (nieuw) return;
    void db.materiaal.get(id).then((x) => {
      setM(x ?? null);
      if (x?.gewichten?.type === 'vast') setVastTekst(x.gewichten.kg.map(formatGetal).join(' '));
      if (x?.gewichten?.type === 'schijven') {
        setSchijvenTekst(x.gewichten.schijven.map((s) => `${formatGetal(s.kg)} x ${s.aantal}`).join('\n'));
      }
    });
  }, [id, nieuw]);

  if (!m) return <section className="screen"><p className="muted">{nl.algemeen.nietGevonden}</p></section>;
  const zet = (patch: Partial<Materiaal>) => setM({ ...m, ...patch });
  const g = m.gewichten;

  const bewaar = async () => {
    const res = valideer(materiaalSchema, m);
    if (!res.ok) return setFouten(res.fouten);
    await db.materiaal.put(res.data);
    navigate(-1);
  };

  const verwijder = async () => {
    if (!window.confirm(t.verwijderVraag)) return;
    await db.materiaal.delete(m.id);
    navigate(-1);
  };

  return (
    <section className="screen">
      <h1>{nieuw ? t.titelNieuw : t.titel}</h1>
      <TextField label={t.naam} value={m.naam} onChange={(naam) => zet({ naam })} autoFocus={nieuw} />
      <Select
        label={t.soort}
        value={m.soort}
        options={materiaalSoort.options.map((s) => ({ value: s, label: t.soorten[s] }))}
        onChange={(soort) => zet({ soort })}
      />
      <Select
        label={t.gewichten}
        value={g?.type ?? 'geen'}
        options={TYPES.map((x) => ({ value: x, label: t.gewichtTypes[x] }))}
        onChange={(type) => {
          setVastTekst('');
          setSchijvenTekst('');
          zet({ gewichten: leegGewicht(type) });
        }}
      />
      {g?.type === 'vast' && (
        <Field label={t.vastKg}>
          <input
            type="text"
            inputMode="decimal"
            value={vastTekst}
            onChange={(e) => {
              setVastTekst(e.target.value);
              zet({ gewichten: { type: 'vast', kg: getallen(e.target.value) } });
            }}
          />
        </Field>
      )}
      {g?.type === 'schijven' && (
        <>
          <NumberField label={t.stangKg} value={g.stangKg} onChange={(v) => zet({ gewichten: { ...g, stangKg: v ?? 0 } })} />
          <Field label={t.schijven}>
            <textarea
              rows={Math.max(3, g.schijven.length + 1)}
              value={schijvenTekst}
              onChange={(e) => {
                setSchijvenTekst(e.target.value);
                zet({ gewichten: { ...g, schijven: parseSchijven(e.target.value) } });
              }}
            />
          </Field>
        </>
      )}
      {g?.type === 'instelbaar' && (
        <div className="grid-2">
          <NumberField label={t.minKg} value={g.minKg} onChange={(v) => zet({ gewichten: { ...g, minKg: v ?? 0 } })} />
          <NumberField label={t.maxKg} value={g.maxKg} onChange={(v) => zet({ gewichten: { ...g, maxKg: v ?? 0 } })} />
          <NumberField label={t.stapKg} value={g.stapKg} onChange={(v) => zet({ gewichten: { ...g, stapKg: v ?? 0 } })} />
        </div>
      )}
      {g?.type === 'standen' && (
        <ListField label={t.standen} value={g.standen} onChange={(standen) => zet({ gewichten: { ...g, standen } })} />
      )}
      <TextArea label={t.notitie} value={m.notitie} onChange={(v) => zet({ notitie: v || undefined })} />
      <Fouten fouten={fouten} />
      <div className="row sticky-actions">
        <button className="btn" onClick={() => navigate(-1)}>
          {nl.algemeen.annuleren}
        </button>
        <button className="btn btn-primary grow" onClick={() => void bewaar()}>
          {nl.algemeen.bewaren}
        </button>
      </div>
      {!nieuw && (
        <button className="btn btn-danger btn-block" onClick={() => void verwijder()}>
          {nl.algemeen.verwijderen}
        </button>
      )}
    </section>
  );
}

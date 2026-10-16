import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import {
  Checkbox,
  Chips,
  Field,
  Fouten,
  ListField,
  NumberField,
  NumberInput,
  RangeField,
  Segmented,
  Select,
  TextArea,
  TextField,
} from '../../components/form';
import { db } from '../../db/db';
import { useTerug } from '../../hooks/useTerug';
import { nl } from '../../i18n/nl';
import { nieuweOefeningConcept } from '../../logic/exerciseDraft';
import { nieuwId } from '../../logic/ids';
import { valideer, type Fout } from '../../logic/parseFile';
import { oefening as oefeningSchema, progressie as progressieSchema, type Oefening, type Progressie, type Trede } from '../../schema';

const t = nl.oefening;
const METINGEN = ['gewicht', 'extraLast', 'variant', 'reps', 'tijd', 'afstand'] as const;
const PROFIELEN = ['anker', 'opbouw', 'power', 'carry', 'isometrisch'] as const;

export default function ExerciseEdit() {
  const { id = 'nieuw' } = useParams();
  const nieuw = id === 'nieuw';
  const terug = useTerug('/oefeningen');
  const materiaal = useLiveQuery(() => db.materiaal.orderBy('naam').toArray(), []);
  // Een nieuwe oefening is eerst een concept; valideren gebeurt pas bij Opslaan.
  const [o, setO] = useState<Oefening | null>(() => (nieuw ? nieuweOefeningConcept(nieuwId('oef')) : null));
  const [fouten, setFouten] = useState<Fout[]>([]);

  useEffect(() => {
    setFouten([]);
    if (nieuw) {
      setO((x) => (x && !x.naam ? x : nieuweOefeningConcept(nieuwId('oef'))));
      return;
    }
    void db.oefeningen.get(id).then((x) => setO(x ?? null));
  }, [id, nieuw]);

  if (!o) return <section className="screen"><p className="muted">{nl.algemeen.nietGevonden}</p></section>;

  const zet = (patch: Partial<Oefening>) => setO({ ...o, ...patch });

  const bewaar = async () => {
    const res = valideer(oefeningSchema, o);
    if (!res.ok) return setFouten(res.fouten);
    try {
      await db.oefeningen.put(res.data);
    } catch (e) {
      return setFouten([{ pad: '', bericht: nl.algemeen.bewarenMislukt((e as Error).message) }]);
    }
    terug();
  };

  const verwijder = async () => {
    const inSessies = await db.entries.where('oefeningId').equals(o.id).count();
    const inSjablonen = (await db.sjablonen.toArray()).filter((s) =>
      s.groepen.some((g) => g.items.some((i) => i.oefeningId === o.id)),
    ).length;
    if (inSessies + inSjablonen > 0) return window.alert(nl.bibliotheek.inGebruik(inSessies + inSjablonen));
    if (!window.confirm(t.verwijderVraag)) return;
    await db.oefeningen.delete(o.id);
    terug();
  };

  return (
    <section className="screen">
      <h1>{nieuw ? t.titelNieuw : t.titel}</h1>
      <TextField
        label={t.naam}
        value={o.naam}
        onChange={(naam) => zet({ naam })}
        autoFocus={nieuw}
        fout={fouten.some((f) => f.pad === 'naam') ? t.naamVerplicht : undefined}
      />
      <ListField label={t.aliassen} value={o.aliassen} onChange={(aliassen) => zet({ aliassen })} />
      <ListField label={t.patronen} hint={t.patronenHint} value={o.patronen} onChange={(patronen) => zet({ patronen })} />
      <Field label={t.metingen}>
        <Chips
          value={o.metingen}
          options={METINGEN.map((m) => ({ value: m, label: nl.metingen[m] }))}
          onChange={(metingen) => zet({ metingen })}
        />
      </Field>
      <Checkbox label={t.unilateraal} checked={o.unilateraal} onChange={(unilateraal) => zet({ unilateraal })} />
      {materiaal && materiaal.length > 0 && (
        <Field label={t.materiaal}>
          <Chips
            value={o.materiaalIds}
            options={materiaal.map((m) => ({ value: m.id, label: m.naam }))}
            onChange={(materiaalIds) => zet({ materiaalIds })}
          />
        </Field>
      )}

      <ProgressieEditor waarde={o.progressie} onChange={(progressie) => zet({ progressie })} />

      <ListField label={t.cues} value={o.cues} onChange={(cues) => zet({ cues })} />
      <ListField label={t.valkuilen} value={o.valkuilen} onChange={(valkuilen) => zet({ valkuilen })} />
      <ListField
        label={t.spierenPrimair}
        value={o.spieren.primair}
        onChange={(primair) => zet({ spieren: { ...o.spieren, primair } })}
      />
      <ListField
        label={t.spierenSecundair}
        value={o.spieren.secundair}
        onChange={(secundair) => zet({ spieren: { ...o.spieren, secundair } })}
      />
      <ListField label={t.videolinks} value={o.videolinks} onChange={(videolinks) => zet({ videolinks })} />
      <ListField label={t.tags} hint={t.tagsHint} value={o.tags} onChange={(tags) => zet({ tags })} />
      <TextArea label={t.notities} value={o.notities} onChange={(v) => zet({ notities: v || undefined })} />
      <Checkbox label={t.gearchiveerd} checked={o.gearchiveerd} onChange={(gearchiveerd) => zet({ gearchiveerd })} />

      <Fouten fouten={fouten.map((f) => (f.pad === 'naam' ? { pad: '', bericht: t.naamVerplicht } : f))} />
      <div className="row sticky-actions">
        <button className="btn" onClick={() => terug()}>
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

function ProgressieEditor({ waarde, onChange }: { waarde: Progressie | undefined; onChange: (p: Progressie | undefined) => void }) {
  if (!waarde) {
    return (
      <div className="card">
        <h2>{t.progressie}</h2>
        <p className="muted">{t.geenProgressie}</p>
        <button className="btn" onClick={() => onChange(progressieSchema.parse({ modus: 'last' }))}>
          {t.progressieToevoegen}
        </button>
      </div>
    );
  }
  const p = waarde;
  const zet = (patch: Partial<Progressie>) => onChange({ ...p, ...patch });
  const zetTrede = (i: number, patch: Partial<Trede>) =>
    zet({ treden: p.treden.map((tr, j) => (j === i ? { ...tr, ...patch } : tr)) });
  const verplaats = (i: number, d: number) => {
    const treden = [...p.treden];
    const [x] = treden.splice(i, 1);
    treden.splice(i + d, 0, x);
    zet({ treden });
  };

  return (
    <div className="card">
      <h2>{t.progressie}</h2>
      <Field label={t.modus}>
        <Segmented
          value={p.modus}
          options={[
            { value: 'ladder', label: t.modi.ladder },
            { value: 'last', label: t.modi.last },
          ]}
          onChange={(modus) => modus && zet({ modus })}
        />
      </Field>
      <Select
        label={t.profiel}
        value={p.profiel ?? ''}
        options={[{ value: '', label: nl.algemeen.geen }, ...PROFIELEN.map((x) => ({ value: x, label: x }))]}
        onChange={(v) => zet({ profiel: (v || undefined) as Progressie['profiel'] })}
      />
      <div className="grid-2">
        <RangeField label={t.repBereik} value={p.repBereik} onChange={(repBereik) => zet({ repBereik })} />
        <NumberField label={t.doelRIR} value={p.doelRIR} onChange={(doelRIR) => zet({ doelRIR })} />
        <NumberField label={t.sets} value={p.sets} onChange={(sets) => zet({ sets })} integer />
        <Select
          label={t.klimCriterium}
          value={p.klim.criterium}
          options={(['rir', 'kwaliteit', 'duur', 'afstand'] as const).map((c) => ({ value: c, label: t.criteria[c] }))}
          onChange={(criterium) => zet({ klim: { ...p.klim, criterium } })}
        />
      </div>

      {p.modus === 'ladder' && (
        <>
          <h3>{t.treden}</h3>
          {p.treden.map((tr, i) => (
            <div key={i} className="subcard">
              <div className="row">
                <strong className="grow">
                  {t.trede} {i + 1}
                </strong>
                <button className="btn btn-small" disabled={i === 0} onClick={() => verplaats(i, -1)} aria-label={t.omhoog}>
                  ↑
                </button>
                <button
                  className="btn btn-small"
                  disabled={i === p.treden.length - 1}
                  onClick={() => verplaats(i, 1)}
                  aria-label={t.omlaag}
                >
                  ↓
                </button>
                <button
                  className="btn btn-small"
                  onClick={() => zet({ treden: p.treden.filter((_, j) => j !== i) })}
                  aria-label={nl.algemeen.verwijderen}
                >
                  ✕
                </button>
              </div>
              <TextField label={t.tredeLabel} value={tr.label} onChange={(label) => zetTrede(i, { label })} />
              <div className="grid-2">
                {(['gewichtKg', 'extraKg', 'duurSec', 'afstandM'] as const).map((k) => (
                  <NumberField
                    key={k}
                    label={nl.last[k]}
                    value={tr.last[k]}
                    onChange={(v) => zetTrede(i, { last: { ...tr.last, [k]: v } })}
                  />
                ))}
                {(['variant', 'tempo'] as const).map((k) => (
                  <TextField
                    key={k}
                    label={nl.last[k]}
                    value={tr.last[k]}
                    onChange={(v) => zetTrede(i, { last: { ...tr.last, [k]: v || undefined } })}
                  />
                ))}
                <RangeField label={t.repBereik} value={tr.repBereik} onChange={(repBereik) => zetTrede(i, { repBereik })} />
              </div>
            </div>
          ))}
          <button className="btn" onClick={() => zet({ treden: [...p.treden, { label: '', last: {} }] })}>
            + {t.tredeToevoegen}
          </button>
          {p.treden.length > 0 && (
            <Select
              label={t.huidigeTrede}
              value={p.huidigeTrede ?? ''}
              options={[{ value: '', label: nl.algemeen.geen }, ...p.treden.filter((x) => x.label).map((x) => ({ value: x.label, label: x.label }))]}
              onChange={(v) => zet({ huidigeTrede: v || undefined })}
            />
          )}
        </>
      )}
      {p.modus === 'last' && (
        <Field label={t.kleinsteStap} hint={nl.algemeen.optioneel}>
          <NumberInput value={p.kleinsteStapKg} onChange={(kleinsteStapKg) => zet({ kleinsteStapKg })} />
        </Field>
      )}
      <button className="btn btn-small" onClick={() => onChange(undefined)}>
        {t.progressieWeg}
      </button>
    </div>
  );
}

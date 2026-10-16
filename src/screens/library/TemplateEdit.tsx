import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import ExercisePicker from '../../components/ExercisePicker';
import { Fouten, ListField, NumberField, RangeField, Select, TextArea, TextField } from '../../components/form';
import { db } from '../../db/db';
import { nl } from '../../i18n/nl';
import { nieuwId } from '../../logic/ids';
import { valideer, type Fout } from '../../logic/parseFile';
import { groepType, sjabloon as sjabloonSchema, type Sjabloon, type SjabloonGroep, type SjabloonItem } from '../../schema';

const t = nl.sjabloon;

function verplaats<T>(lijst: T[], i: number, d: number): T[] {
  const kopie = [...lijst];
  const [x] = kopie.splice(i, 1);
  kopie.splice(i + d, 0, x);
  return kopie;
}

export default function TemplateEdit() {
  const { id = 'nieuw' } = useParams();
  const nieuw = id === 'nieuw';
  const navigate = useNavigate();
  const oefeningen = useLiveQuery(() => db.oefeningen.toArray(), []);
  const namen = new Map((oefeningen ?? []).map((o) => [o.id, o.naam]));
  const [s, setS] = useState<Sjabloon | null>(
    nieuw ? { id: nieuwId('sjab'), naam: '', opwarming: [], groepen: [{ label: 'A', type: 'enkel', rondes: 1, items: [] }] } : null,
  );
  const [picker, setPicker] = useState<number | null>(null);
  const [fouten, setFouten] = useState<Fout[]>([]);

  useEffect(() => {
    if (!nieuw) void db.sjablonen.get(id).then((x) => setS(x ?? null));
  }, [id, nieuw]);

  if (!s) return <section className="screen"><p className="muted">{nl.algemeen.nietGevonden}</p></section>;

  const zet = (patch: Partial<Sjabloon>) => setS({ ...s, ...patch });
  const zetGroep = (gi: number, patch: Partial<SjabloonGroep>) =>
    zet({ groepen: s.groepen.map((g, i) => (i === gi ? { ...g, ...patch } : g)) });
  const zetItem = (gi: number, ii: number, patch: Partial<SjabloonItem>) =>
    zetGroep(gi, { items: s.groepen[gi].items.map((it, i) => (i === ii ? { ...it, ...patch } : it)) });

  const bewaar = async () => {
    if (!s.naam.trim()) return setFouten([{ pad: '', bericht: t.naamVerplicht }]);
    if (s.groepen.length === 0) return setFouten([{ pad: '', bericht: t.minstensEenGroep }]);
    if (s.groepen.some((g) => g.items.length === 0)) return setFouten([{ pad: '', bericht: t.groepLeeg }]);
    const res = valideer(sjabloonSchema, s);
    if (!res.ok) return setFouten(res.fouten);
    await db.sjablonen.put(res.data);
    navigate(-1);
  };

  const verwijder = async () => {
    if (!window.confirm(t.verwijderVraag)) return;
    await db.sjablonen.delete(s.id);
    navigate(-1);
  };

  const volgendLabel = String.fromCharCode(65 + s.groepen.length);

  return (
    <section className="screen">
      <h1>{nieuw ? t.titelNieuw : t.titel}</h1>
      <TextField label={t.naam} value={s.naam} onChange={(naam) => zet({ naam })} autoFocus={nieuw} />
      <ListField label={t.opwarming} value={s.opwarming} onChange={(opwarming) => zet({ opwarming })} />
      <TextArea label={t.notitie} value={s.notitie} onChange={(v) => zet({ notitie: v || undefined })} rows={2} />

      {s.groepen.map((g, gi) => (
        <div key={gi} className="card">
          <div className="row">
            <h2 className="grow">
              {t.groep} {g.label ?? gi + 1}
            </h2>
            <button className="btn btn-small" disabled={gi === 0} onClick={() => zet({ groepen: verplaats(s.groepen, gi, -1) })} aria-label={nl.oefening.omhoog}>
              ↑
            </button>
            <button
              className="btn btn-small"
              disabled={gi === s.groepen.length - 1}
              onClick={() => zet({ groepen: verplaats(s.groepen, gi, 1) })}
              aria-label={nl.oefening.omlaag}
            >
              ↓
            </button>
          </div>
          <div className="grid-2">
            <TextField label={t.groepLabel} value={g.label} onChange={(v) => zetGroep(gi, { label: v || undefined })} />
            <Select
              label={t.groepType}
              value={g.type}
              options={groepType.options.map((x) => ({ value: x, label: nl.groepTypes[x] }))}
              onChange={(type) => zetGroep(gi, { type })}
            />
            {g.type !== 'enkel' && g.type !== 'amrap' && (
              <NumberField label={t.rondes} value={g.rondes} onChange={(v) => zetGroep(gi, { rondes: v ?? 1 })} integer />
            )}
            {(g.type === 'superset' || g.type === 'circuit') && (
              <>
                <NumberField label={t.rustOefeningen} value={g.rustTussenOefeningenSec} onChange={(v) => zetGroep(gi, { rustTussenOefeningenSec: v })} />
                <NumberField label={t.rustRondes} value={g.rustTussenRondesSec} onChange={(v) => zetGroep(gi, { rustTussenRondesSec: v })} />
              </>
            )}
            {(g.type === 'amrap' || g.type === 'emom') && (
              <NumberField label={t.duurSec} value={g.duurSec} onChange={(v) => zetGroep(gi, { duurSec: v })} />
            )}
            {g.type === 'emom' && (
              <NumberField label={t.intervalSec} value={g.intervalSec} onChange={(v) => zetGroep(gi, { intervalSec: v })} />
            )}
          </div>

          {g.items.map((it, ii) => (
            <div key={ii} className="subcard">
              <div className="row">
                <strong className="grow">{namen.get(it.oefeningId) ?? nl.algemeen.onbekendeOefening}</strong>
                <button className="btn btn-small" disabled={ii === 0} onClick={() => zetGroep(gi, { items: verplaats(g.items, ii, -1) })} aria-label={nl.oefening.omhoog}>
                  ↑
                </button>
                <button
                  className="btn btn-small"
                  onClick={() => zetGroep(gi, { items: g.items.filter((_, j) => j !== ii) })}
                  aria-label={nl.algemeen.verwijderen}
                >
                  ✕
                </button>
              </div>
              <div className="grid-2">
                {g.type === 'enkel' && <NumberField label={t.sets} value={it.sets} onChange={(sets) => zetItem(gi, ii, { sets })} integer />}
                <RangeField label={t.repBereik} value={it.repBereik} onChange={(repBereik) => zetItem(gi, ii, { repBereik })} />
                <NumberField label={t.doelRIR} value={it.doelRIR} onChange={(doelRIR) => zetItem(gi, ii, { doelRIR })} />
                <NumberField label={t.rustSec} value={it.rustSec} onChange={(rustSec) => zetItem(gi, ii, { rustSec })} />
                <Select
                  label={t.rol}
                  value={it.rol ?? 'geen'}
                  options={['geen', 'anker', 'rotatie'].map((r) => ({ value: r, label: t.rollen[r] }))}
                  onChange={(r) => zetItem(gi, ii, { rol: r === 'geen' ? undefined : (r as 'anker' | 'rotatie') })}
                />
              </div>
              <TextField label={t.notitieItem} value={it.notitie} onChange={(v) => zetItem(gi, ii, { notitie: v || undefined })} />
            </div>
          ))}
          <button className="btn btn-block" onClick={() => setPicker(gi)}>
            + {t.oefeningToevoegen}
          </button>
          <button className="btn btn-small" onClick={() => zet({ groepen: s.groepen.filter((_, j) => j !== gi) })}>
            {t.groepVerwijderen}
          </button>
        </div>
      ))}
      <button
        className="btn btn-block"
        onClick={() => zet({ groepen: [...s.groepen, { label: volgendLabel, type: 'enkel', rondes: 1, items: [] }] })}
      >
        + {t.groepToevoegen}
      </button>

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

      {picker !== null && (
        <ExercisePicker
          titel={t.oefeningToevoegen}
          onSluit={() => setPicker(null)}
          onKies={(o) => {
            zetGroep(picker, { items: [...s.groepen[picker].items, { oefeningId: o.id }] });
            setPicker(null);
          }}
        />
      )}
    </section>
  );
}

import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { db } from '../db/db';
import { leesSnapshot, pasImportToe, vervangAlles, wisAlles, zetLaatsteBackup } from '../db/repo';
import { nl } from '../i18n/nl';
import { backupBestandsnaam, backupNaarSnapshot, maakBackup } from '../logic/backup';
import { dagenGeleden, formatDatum, formatDatumTijd } from '../logic/format';
import { NIEUW, maakImportPlan, twijfelgevallen, voerImportUit, type ImportPlan, type Keuzes } from '../logic/importPlan';
import { parseBestand, type Fout } from '../logic/parseFile';
import { formatMb, requestPersistence, type PersistStatus } from '../logic/storage';
import { persistenceStatus } from '../persistence';
import type { BibliotheekBestand, LogsBestand } from '../schema';
import { deelJson, downloadJson, kanDelen, leesTekst } from '../ui/files';

const t = nl.data;

export default function DataScreen() {
  return (
    <section className="screen">
      <h1>{t.title}</h1>
      <BackupCard />
      <ImportCard />
      <RestoreCard />
      <StorageCard />
      <WipeCard />
    </section>
  );
}

function wanneer(iso: string) {
  const d = dagenGeleden(iso);
  return `${formatDatum(iso)} (${d === 0 ? t.vandaag : t.dagenGeleden(d)})`;
}

function BackupCard() {
  const inst = useLiveQuery(() => db.instellingen.get('instellingen'));
  const [melding, setMelding] = useState('');
  const laatste = inst?.value.laatsteBackup;

  const maak = async (delen: boolean) => {
    setMelding('');
    const nu = new Date();
    const backup = maakBackup(await leesSnapshot(), nu);
    const naam = backupBestandsnaam(nu);
    if (delen) {
      if (!(await deelJson(naam, backup))) return;
    } else {
      downloadJson(naam, backup);
    }
    await zetLaatsteBackup(nu);
    setMelding(t.backupGemaakt);
  };

  return (
    <div className="card">
      <h2>{t.backupTitel}</h2>
      <p className="muted">{t.backupUitleg}</p>
      <p className={laatste && dagenGeleden(laatste) < 7 ? '' : 'warn'}>
        {laatste ? t.laatsteBackup(wanneer(laatste)) : t.nooitBackup}
      </p>
      <div className="stack">
        <button className="btn btn-primary btn-block" onClick={() => void maak(false)}>
          {t.downloaden}
        </button>
        {kanDelen() && (
          <button className="btn btn-block" onClick={() => void maak(true)}>
            {t.delen}
          </button>
        )}
      </div>
      {melding && <p className="ok">{melding}</p>}
    </div>
  );
}

function FoutLijst({ fouten }: { fouten: Fout[] }) {
  return (
    <div className="errors" role="alert">
      <p>{t.importFouten(fouten.length)}</p>
      <ul>
        {fouten.map((f, i) => (
          <li key={i}>
            <code>{f.pad}</code>: {f.bericht}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RestoreCard() {
  const [fouten, setFouten] = useState<Fout[]>([]);
  const [melding, setMelding] = useState('');

  const kies = async (file: File | undefined) => {
    setFouten([]);
    setMelding('');
    if (!file) return;
    let tekst: string;
    try {
      tekst = await leesTekst(file);
    } catch {
      setFouten([{ pad: file.name, bericht: t.leesFout }]);
      return;
    }
    const res = parseBestand(tekst);
    if (!res.ok) return setFouten(res.fouten);
    if (res.soort !== 'backup') return setFouten([{ pad: 'soort', bericht: `${t.herstelGeenBackup} "${res.soort}".` }]);
    const b = res.bestand;
    const vraag = t.herstelVraag({
      oefeningen: b.oefeningen.length,
      sjablonen: b.sjablonen.length,
      sessies: b.sessies.length,
      datum: b.gemaaktOp ? formatDatumTijd(b.gemaaktOp) : file.name,
    });
    if (!window.confirm(vraag)) return;
    await vervangAlles(backupNaarSnapshot(b));
    setMelding(t.herstelKlaar);
  };

  return (
    <div className="card">
      <h2>{t.herstelTitel}</h2>
      <p className="muted">{t.herstelUitleg}</p>
      <label className="btn btn-block file-btn">
        {t.herstelKies}
        <input
          type="file"
          accept="application/json,.json"
          onChange={(e) => {
            void kies(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </label>
      {fouten.length > 0 && <FoutLijst fouten={fouten} />}
      {melding && <p className="ok">{melding}</p>}
    </div>
  );
}

type ImportStap =
  | { stap: 'invoer' }
  | { stap: 'fouten'; fouten: Fout[] }
  | { stap: 'plan'; bestand: BibliotheekBestand | LogsBestand; plan: ImportPlan; keuzes: Keuzes }
  | { stap: 'klaar'; regels: string[] };

function ImportCard() {
  const [plak, setPlak] = useState('');
  const [toestand, setToestand] = useState<ImportStap>({ stap: 'invoer' });

  const controleer = async (tekst: string) => {
    const res = parseBestand(tekst);
    if (!res.ok) return setToestand({ stap: 'fouten', fouten: res.fouten });
    if (res.soort === 'backup') return setToestand({ stap: 'fouten', fouten: [{ pad: 'soort', bericht: t.importIsBackup }] });
    const bestaand = await huidig();
    const plan = maakImportPlan(res.bestand, bestaand);
    const keuzes: Keuzes = {};
    for (const o of twijfelgevallen(plan)) {
      if (o.match.type === 'twijfel') keuzes[o.bron.id] = o.match.kandidaten[0].id;
    }
    setToestand({ stap: 'plan', bestand: res.bestand, plan, keuzes });
  };

  const kiesBestand = async (file: File | undefined) => {
    if (!file) return;
    try {
      await controleer(await leesTekst(file));
    } catch {
      setToestand({ stap: 'fouten', fouten: [{ pad: file.name, bericht: t.leesFout }] });
    }
  };

  const voerUit = async () => {
    if (toestand.stap !== 'plan') return;
    const res = voerImportUit(toestand.plan, toestand.keuzes, await huidig());
    await pasImportToe(res);
    setPlak('');
    setToestand({ stap: 'klaar', regels: t.samenvattingRegels(res.samenvatting) });
  };

  return (
    <div className="card">
      <h2>{t.importTitel}</h2>
      {toestand.stap === 'plan' ? (
        <ImportPlanView
          plan={toestand.plan}
          keuzes={toestand.keuzes}
          setKeuze={(id, waarde) => setToestand({ ...toestand, keuzes: { ...toestand.keuzes, [id]: waarde } })}
          onImport={() => void voerUit()}
          onAnnuleer={() => setToestand({ stap: 'invoer' })}
        />
      ) : (
        <>
          <p className="muted">{t.importUitleg}</p>
          <label className="btn btn-block file-btn">
            {t.importKies}
            <input
              type="file"
              accept="application/json,.json"
              onChange={(e) => {
                void kiesBestand(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
          <label className="field">
            <span>{t.importPlak}</span>
            <textarea rows={4} value={plak} onChange={(e) => setPlak(e.target.value)} spellCheck={false} />
          </label>
          <button className="btn btn-block" disabled={!plak.trim()} onClick={() => void controleer(plak)}>
            {t.importControleer}
          </button>
          {toestand.stap === 'fouten' && <FoutLijst fouten={toestand.fouten} />}
          {toestand.stap === 'klaar' && (
            <div className="ok">
              <p>{t.importKlaar}</p>
              <ul>
                {toestand.regels.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

async function huidig() {
  return {
    materiaal: await db.materiaal.toArray(),
    oefeningen: await db.oefeningen.toArray(),
    sjablonen: await db.sjablonen.toArray(),
    sessieIds: (await db.sessies.toCollection().primaryKeys()) as string[],
  };
}

function ImportPlanView(props: {
  plan: ImportPlan;
  keuzes: Keuzes;
  setKeuze: (id: string, waarde: string) => void;
  onImport: () => void;
  onAnnuleer: () => void;
}) {
  const [samenvatting, setSamenvatting] = useState<string[] | null>(null);
  const twijfel = twijfelgevallen(props.plan);

  useEffect(() => {
    let actief = true;
    void huidig().then((b) => {
      if (actief) setSamenvatting(t.samenvattingRegels(voerImportUit(props.plan, props.keuzes, b).samenvatting));
    });
    return () => {
      actief = false;
    };
  }, [props.plan, props.keuzes]);

  return (
    <>
      {twijfel.length > 0 && (
        <>
          <h3>{t.twijfelTitel}</h3>
          <p className="muted">{t.twijfelUitleg}</p>
          {twijfel.map(({ bron, match }) =>
            match.type !== 'twijfel' ? null : (
              <fieldset key={bron.id} className="choice-group">
                <legend>
                  {t.uitBestand}: <strong>{bron.naam}</strong>
                </legend>
                {match.kandidaten.map((k) => (
                  <label key={k.id} className="radio">
                    <input
                      type="radio"
                      name={`k-${bron.id}`}
                      checked={props.keuzes[bron.id] === k.id}
                      onChange={() => props.setKeuze(bron.id, k.id)}
                    />
                    {t.koppelAan(k.naam)}
                  </label>
                ))}
                <label className="radio">
                  <input
                    type="radio"
                    name={`k-${bron.id}`}
                    checked={props.keuzes[bron.id] === NIEUW}
                    onChange={() => props.setKeuze(bron.id, NIEUW)}
                  />
                  {t.nieuweOefening}
                </label>
              </fieldset>
            ),
          )}
        </>
      )}
      <h3>{t.samenvatting}</h3>
      {samenvatting && samenvatting.length === 0 ? (
        <p>{t.importNiets}</p>
      ) : (
        <ul>
          {samenvatting?.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      <div className="row">
        <button className="btn" onClick={props.onAnnuleer}>
          {nl.algemeen.annuleren}
        </button>
        <button className="btn btn-primary grow" disabled={!samenvatting?.length} onClick={props.onImport}>
          {t.importStart}
        </button>
      </div>
    </>
  );
}

function StorageCard() {
  const [status, setStatus] = useState<PersistStatus | null>(null);
  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(null);

  useEffect(() => {
    void persistenceStatus().then(setStatus);
    navigator.storage?.estimate?.().then((e) => {
      if (e.usage !== undefined && e.quota) setUsage({ used: e.usage, quota: e.quota });
    });
  }, []);

  const retry = async () => setStatus(await requestPersistence(navigator.storage));

  return (
    <div className="card">
      <h2>{t.storageTitle}</h2>
      <p className={`status status-${status ?? 'checking'}`}>
        {status ? t.storageStatus[status] : t.storageStatus.checking}
      </p>
      {status && <p className="muted">{t.storageExplain[status]}</p>}
      {usage && <p className="muted small">{t.usage(formatMb(usage.used), formatMb(usage.quota))}</p>}
      {status === 'notPersisted' && (
        <button className="btn" onClick={() => void retry()}>
          {t.retry}
        </button>
      )}
    </div>
  );
}

function WipeCard() {
  const [melding, setMelding] = useState('');
  const wis = async () => {
    setMelding('');
    if (!window.confirm(t.wisVraag)) return;
    await wisAlles();
    setMelding(t.wisKlaar);
  };
  return (
    <div className="card">
      <h2>{t.wisTitel}</h2>
      <p className="muted">{t.wisUitleg}</p>
      <button className="btn btn-danger btn-block" onClick={() => void wis()}>
        {t.wisKnop}
      </button>
      {melding && <p className="ok">{melding}</p>}
    </div>
  );
}

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { nl } from '../i18n/nl';
import { punten, repsPerVariant } from '../logic/charts';
import { formatGetal } from '../logic/format';
import type { Gedaan } from '../logic/progression';
import type { Oefening } from '../schema';

// Grafieken in puur zwart-wit: lijnen en vlakken in currentColor (= --fg), raster in --line.
// Eén maat per grafiek (nooit twee assen). Wordt pas geladen als het paneel opent.

const t = nl.overzicht;
const HOOGTE = 140;
const as = { fontSize: 11, fill: 'currentColor', opacity: 0.6 };
const datumKort = (d: string) => `${Number(d.slice(8, 10))}/${Number(d.slice(5, 7))}`;

function TipInhoud(props: { active?: boolean; label?: string; payload?: { name?: string; value?: number; dataKey?: string }[]; eenheid: string }) {
  if (!props.active || !props.payload?.length) return null;
  return (
    <div className="chart-tip">
      <strong>{props.label ? datumKort(props.label) : ''}</strong>
      {props.payload.map((p) => (
        <div key={String(p.dataKey)}>
          {props.payload!.length > 1 ? `${p.name}: ` : ''}
          {formatGetal(p.value ?? 0)} {props.eenheid}
        </div>
      ))}
    </div>
  );
}

function Lijn({ data, veld, eenheid, titel }: { data: object[]; veld: string; eenheid: string; titel: string }) {
  return (
    <figure className="chart">
      <figcaption>{titel}</figcaption>
      <ResponsiveContainer width="100%" height={HOOGTE}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="datum" tickFormatter={datumKort} tick={as} stroke="var(--line)" />
          <YAxis tick={as} stroke="var(--line)" domain={['auto', 'auto']} width={48} allowDecimals={false} tickFormatter={(v: number) => formatGetal(v)} />
          <Tooltip content={<TipInhoud eenheid={eenheid} />} cursor={{ stroke: 'currentColor', strokeOpacity: 0.3 }} />
          <Line
            type="linear"
            dataKey={veld}
            name={titel}
            stroke="currentColor"
            strokeWidth={2}
            dot={{ r: 4, fill: 'currentColor', strokeWidth: 0 }}
            activeDot={{ r: 6 }}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}

export default function ProgressCharts({ historiek, oefening, lichaamsgewichtKg }: { historiek: Gedaan[]; oefening: Oefening; lichaamsgewichtKg?: number }) {
  const data = punten(historiek, lichaamsgewichtKg);
  if (data.length < 2) return <p className="muted small">{t.teWeinigVoorGrafiek}</p>;
  const metLast = data.some((p) => p.topset !== undefined);
  const metE1rm = data.filter((p) => p.e1rm !== undefined).length >= 2;
  const varianten = repsPerVariant(historiek, oefening);
  const toonVarianten = varianten.varianten.length > 1 || oefening.progressie?.modus === 'ladder';

  return (
    <div className="charts">
      {metLast && <Lijn data={data} veld="topset" eenheid="kg" titel={t.topset} />}
      {metE1rm && <Lijn data={data} veld="e1rm" eenheid="kg" titel={t.e1rm} />}
      <figure className="chart">
        <figcaption>{metLast ? t.volumeKg : t.volumeReps}</figcaption>
        <ResponsiveContainer width="100%" height={HOOGTE}>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis dataKey="datum" tickFormatter={datumKort} tick={as} stroke="var(--line)" />
            <YAxis tick={as} stroke="var(--line)" width={48} allowDecimals={false} tickFormatter={(v: number) => formatGetal(v)} />
            <Tooltip content={<TipInhoud eenheid={metLast ? 'kg' : t.reps} />} cursor={{ fill: 'currentColor', fillOpacity: 0.06 }} />
            <Bar dataKey="volume" name={t.volumeKg} fill="currentColor" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </figure>
      {toonVarianten && (
        <figure className="chart">
          <figcaption>{t.repsPerVariant}</figcaption>
          <ResponsiveContainer width="100%" height={HOOGTE}>
            <BarChart data={varianten.rijen} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis dataKey="datum" tickFormatter={datumKort} tick={as} stroke="var(--line)" />
              <YAxis tick={as} stroke="var(--line)" width={48} allowDecimals={false} />
              <Tooltip content={<TipInhoud eenheid={t.reps} />} cursor={{ fill: 'currentColor', fillOpacity: 0.06 }} />
              {varianten.varianten.map((v, i) => (
                <Bar
                  key={v}
                  dataKey={v}
                  name={v}
                  stackId="v"
                  fill="currentColor"
                  fillOpacity={1 - (i / Math.max(1, varianten.varianten.length)) * 0.75}
                  stroke="var(--bg)"
                  strokeWidth={2}
                  maxBarSize={24}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
          <ul className="legend">
            {varianten.varianten.map((v, i) => (
              <li key={v}>
                <span className="swatch" style={{ opacity: 1 - (i / Math.max(1, varianten.varianten.length)) * 0.75 }} />
                {v}
              </li>
            ))}
          </ul>
        </figure>
      )}
    </div>
  );
}

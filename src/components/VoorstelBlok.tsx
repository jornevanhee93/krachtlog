import { nl } from '../i18n/nl';
import { voorstelTekst, type Voorstel } from '../logic/progression';

/** Het voorstel voor de volgende keer: wat, waarom, en eventueel alternatieven. */
export default function VoorstelBlok({ voorstel }: { voorstel: Voorstel }) {
  const tekst = voorstelTekst(voorstel);
  return (
    <div className="voorstel">
      <p className="voorstel-kop">
        <span className="voorstel-type">{nl.voorstel.types[voorstel.type]}</span>
        {tekst && <strong>{tekst}</strong>}
      </p>
      <p className="muted small">{voorstel.uitleg}</p>
      {voorstel.alternatieven.length > 0 && (
        <ul className="small">
          {voorstel.alternatieven.map((a) => (
            <li key={a.stap}>{a.tekst}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

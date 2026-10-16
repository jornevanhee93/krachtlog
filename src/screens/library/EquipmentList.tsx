import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { db } from '../../db/db';
import { nl } from '../../i18n/nl';
import { formatGetal } from '../../logic/format';
import type { Materiaal } from '../../schema';
import LibraryTabs from './LibraryTabs';

export function gewichtenTekst(m: Materiaal): string {
  const g = m.gewichten;
  if (!g) return '';
  switch (g.type) {
    case 'vast':
      return g.kg.map(formatGetal).join(' · ') + ' kg';
    case 'schijven':
      return `${formatGetal(g.stangKg)} kg + ${g.schijven.map((s) => `${s.aantal}×${formatGetal(s.kg)}`).join(', ')}`;
    case 'instelbaar':
      return `${formatGetal(g.minKg)}–${formatGetal(g.maxKg)} kg per ${formatGetal(g.stapKg)}`;
    case 'standen':
      return g.standen.join(' · ');
  }
}

export default function EquipmentList() {
  const lijst = useLiveQuery(() => db.materiaal.orderBy('naam').toArray(), []);
  return (
    <section className="screen">
      <h1>{nl.nav.exercises}</h1>
      <LibraryTabs />
      <Link to="/materiaal/nieuw" className="btn btn-primary btn-block">
        + {nl.bibliotheek.nieuwMateriaal}
      </Link>
      {lijst && lijst.length === 0 && <p className="muted">{nl.bibliotheek.geenMateriaal}</p>}
      <ul className="list">
        {lijst?.map((m) => (
          <li key={m.id}>
            <Link to={`/materiaal/${encodeURIComponent(m.id)}`} className="list-item">
              <strong>{m.naam}</strong>
              <small className="muted">
                {[nl.materiaal.soorten[m.soort], gewichtenTekst(m)].filter(Boolean).join(' · ')}
              </small>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

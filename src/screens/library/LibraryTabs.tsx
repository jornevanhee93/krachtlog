import { NavLink } from 'react-router';
import { nl } from '../../i18n/nl';

export default function LibraryTabs() {
  const t = nl.bibliotheek.tabs;
  return (
    <nav className="tabs">
      <NavLink to="/oefeningen" end>
        {t.oefeningen}
      </NavLink>
      <NavLink to="/sjablonen" end>
        {t.sjablonen}
      </NavLink>
      <NavLink to="/materiaal" end>
        {t.materiaal}
      </NavLink>
    </nav>
  );
}

import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router';
import { nl } from '../i18n/nl';

const icon = (path: ReactNode) => (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {path}
  </svg>
);

const items = [
  { to: '/', also: ['/training', '/programmas', '/gepland'], label: nl.nav.today, icon: icon(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>) },
  { to: '/oefeningen', also: ['/sjablonen', '/materiaal'], label: nl.nav.exercises, icon: icon(<><path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12" /></>) },
  { to: '/historiek', also: [], label: nl.nav.history, icon: icon(<><path d="M4 5h16M4 12h16M4 19h10" /></>) },
  { to: '/data', also: [], label: nl.nav.data, icon: icon(<><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></>) },
];

function isActief(pad: string, item: (typeof items)[number]) {
  if (item.to === '/') return pad === '/' || item.also.some((a) => pad.startsWith(a));
  return [item.to, ...item.also].some((a) => pad === a || pad.startsWith(`${a}/`));
}

export default function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={() => `bottom-nav-item ${isActief(pathname, item) ? 'active' : ''}`}
        >
          {item.icon}
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

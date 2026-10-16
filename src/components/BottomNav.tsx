import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { nl } from '../i18n/nl';

const icon = (path: ReactNode) => (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {path}
  </svg>
);

const items = [
  { to: '/', label: nl.nav.today, icon: icon(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>) },
  { to: '/oefeningen', label: nl.nav.exercises, icon: icon(<><path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12" /></>) },
  { to: '/historiek', label: nl.nav.history, icon: icon(<><path d="M4 5h16M4 12h16M4 19h10" /></>) },
  { to: '/data', label: nl.nav.data, icon: icon(<><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></>) },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end className="bottom-nav-item">
          {item.icon}
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

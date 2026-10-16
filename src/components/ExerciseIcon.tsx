import type { ReactNode } from 'react';
import type { Icoon } from '../schema';

// Eigen lijniconen in één stijl: 24×24, lijndikte 1.75, ronde uiteinden, kleur = currentColor.
const PADEN: Record<Icoon, ReactNode> = {
  lichaamsgewicht: (
    <>
      <circle cx="12" cy="4.5" r="2" />
      <path d="M12 7.5v6.5M6 9.5l6-1.5 6 1.5M12 14l-3.5 6.5M12 14l3.5 6.5" />
    </>
  ),
  zandzak: (
    <>
      <rect x="3" y="8" width="18" height="10" rx="4" />
      <path d="M8 8V5.5h3V8M13 8V5.5h3V8M7 13h10" />
    </>
  ),
  kettlebell: (
    <>
      <circle cx="12" cy="14.5" r="6.5" />
      <path d="M7.4 9.9 6.8 5.5A1.5 1.5 0 0 1 8.3 4h7.4a1.5 1.5 0 0 1 1.5 1.5l-.6 4.4" />
    </>
  ),
  dumbbell: <path d="M4 9.5v5M7 7.5v9M17 7.5v9M20 9.5v5M7 12h10" />,
  stang: <path d="M2 12h20M5 6.5v11M8 8.5v7M16 8.5v7M19 6.5v11" />,
  vest: (
    <>
      <path d="M8.5 3 5 6.5V20h14V6.5L15.5 3" />
      <path d="M8.5 3c1 3.5 6 3.5 7 0M5 13h14" />
    </>
  ),
  macebell: (
    <>
      <circle cx="16.5" cy="7.5" r="4" />
      <path d="M13.7 10.3 4 20" />
    </>
  ),
  box: <path d="M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8" />,
  elastiek: <path d="M3 9c3-4 6 4 9 0s6 4 9 0M3 15c3-4 6 4 9 0s6 4 9 0" />,
  sled: <path d="M3 18h15.5a2.5 2.5 0 0 0 2.5-2.5M5 18v-7h10v7M15 13l5-6" />,
};

export default function ExerciseIcon({ icoon, size = 24, label }: { icoon: Icoon; size?: number; label?: string }) {
  return (
    <svg
      className="ex-icon"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {PADEN[icoon]}
    </svg>
  );
}

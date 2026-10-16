# krachtlog-app

Persoonlijke PWA (Android via Chrome) om krachttraining te plannen, uit te voeren en te loggen. Eén gebruiker (de gebruiker), geen backend, geen login. De data staat alleen op het toestel (IndexedDB).

- Plan en fasen: `docs/plan.md`
- Principes achter de progressie: `docs/trainingsfilosofie.md`
- JSON-schema voor import/export: `docs/schema.md` (vanaf fase 1)

## Over de gebruiker
de gebruiker programmeert niet. Leg keuzes kort uit, in het Nederlands. Sluit elke werkende stap af met een **"Zo test je het"**-blok: precies wat hij moet tikken of openen, op pc of telefoon.

## Stack
Vite + React + TypeScript · Dexie (IndexedDB) · vite-plugin-pwa · Zod (validatie) · Recharts · Vitest · HashRouter · gewone CSS met variabelen. Hosting op GitHub Pages via een GitHub Action bij een push naar `main`.

Repo: `jornevanhee93/krachtlog`. De app draait op https://jornevanhee93.github.io/krachtlog/, dus Vite heeft `base: '/krachtlog/'` nodig.

## Conventies
- Code, bestandsnamen en identifiers in het Engels. Alle UI-teksten in het Nederlands, centraal in `src/i18n/nl.ts`.
- Domeinlogica (progressie, lastcalculator, planning, import/export) als pure functies in `src/logic/`, met de tests ernaast (`*.test.ts`). Componenten bevatten geen domeinlogica.
- Trainingsprincipes (termijnen, RIR-vloeren, stagnatiedrempels) zijn bewerkbare standaardwaarden in de data, niet hard in de code. Zie `docs/trainingsfilosofie.md`.
- De JSON-schema's staan in Zod (`src/schema/`). Wijzigt een schema, verhoog dan `schemaVersie`, schrijf een migratie en werk `docs/schema.md` bij.
- Mobile-first en met één hand te bedienen: knoppen van minstens 48px, zo weinig mogelijk typen. Donkere modus via `prefers-color-scheme`.
- Git: commit na elke werkende stap, met een Nederlandse commitboodschap. Er komt nooit trainingsdata in de repo.

## Commando's
- `npm run dev`: lokaal draaien
- `npm test`: tests
- `npm run build`: productiebuild

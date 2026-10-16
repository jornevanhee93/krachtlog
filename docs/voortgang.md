lock: 2026-10-16T21:45:51Z run-a1

# Voortgang nachtbouw

Afgevinkt = klaar en getest (met commit).

## Werklijst
- [x] 0. Privacy-opruiming (notitie-app-verwijzingen en voornaam weg) — 9a82746
- [x] 1. UX-stap 3: design puur zwart-wit — gecontroleerd met Playwright (375×812, licht+donker: geen horizontaal scrollen, alleen grijswaarden); dubbele 'Geef een naam.' opgelost
- [x] 2. UX-stap 4: iconen — eigen SVG-lijniconen, automatisch uit materiaal, te overschrijven; schemaVersie 2 (+ migratie, v1 blijft importeerbaar); icoon in lijst en trainingskaart (paneel: zie item 4)
- [x] 3. UX-stap 5: training als accordeon — open/dicht per kaart, auto-volgende, opwarmsets inklapbaar, klok sticky (e2e/training.spec.ts)
- [x] 4. UX-stap 6: overzichtspaneel — vanuit training (naam/icoon) en oefeningenlijst, veeg/knop sluit; grafieken en voorstel volgen in item 5
- [x] 5. Fase 2: progressie — src/logic/loadCalc.ts, progression.ts, charts.ts (+ tests); voorstel en grafieken in het paneel; 'Vandaag' per oefening in de training; voorstel ingevuld bij de start; Instellingen-kaart op Data
- [x] 6. Fase 3: programma's — schema v3 + migratie, Dexie v2 (upgradetest), planningslogica + tests, import (bestand/plakken), Vandaag (gemist: inhalen/overslaan, 48u), programmaschermen, geplande sessie aanpassen, termijnwaarschuwingen (e2e/programma.spec.ts)
- [x] 7. Fase 4: export (JSON + tekst, periode), back-upherinnering volgt instelling (Vandaag + Data), terugknop sluit paneel, historiek toont naam van geplande sessies (e2e/export.spec.ts)
- [ ] 8. Eindtest en testschema

## Log per run
- 2026-10-16 21:00 UTC (run-a1): lock gezet, privacy-opruiming, design gecontroleerd, Playwright werkt hier (Chromium in /opt/pw-browsers), e2e-tests in `e2e/`.
- 2026-10-16 21:55 UTC (run-a1): items 2–7 gebouwd en getest (zie commits). Nu: item 8, eindtest + testschema.

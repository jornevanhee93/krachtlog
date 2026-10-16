lock: 2026-10-16T21:23:16Z run-a1

# Voortgang nachtbouw

Afgevinkt = klaar en getest (met commit).

## Werklijst
- [x] 0. Privacy-opruiming (notitie-app-verwijzingen en voornaam weg) — 9a82746
- [x] 1. UX-stap 3: design puur zwart-wit — gecontroleerd met Playwright (375×812, licht+donker: geen horizontaal scrollen, alleen grijswaarden); dubbele 'Geef een naam.' opgelost
- [x] 2. UX-stap 4: iconen — eigen SVG-lijniconen, automatisch uit materiaal, te overschrijven; schemaVersie 2 (+ migratie, v1 blijft importeerbaar); icoon in lijst en trainingskaart (paneel: zie item 4)
- [x] 3. UX-stap 5: training als accordeon — open/dicht per kaart, auto-volgende, opwarmsets inklapbaar, klok sticky (e2e/training.spec.ts)
- [x] 4. UX-stap 6: overzichtspaneel — vanuit training (naam/icoon) en oefeningenlijst, veeg/knop sluit; grafieken en voorstel volgen in item 5
- [ ] 5. Fase 2: progressie
- [ ] 6. Fase 3: programma's
- [ ] 7. Fase 4: export, back-upherinnering, kleine UX
- [ ] 8. Eindtest en testschema

## Log per run
- 2026-10-16 21:00 UTC (run-a1): lock gezet, privacy-opruiming, design gecontroleerd, Playwright werkt hier (Chromium in /opt/pw-browsers), e2e-tests in `e2e/`.

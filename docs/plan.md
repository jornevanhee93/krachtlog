# Plan: krachtlog-app

## Context
de gebruiker wil een eigen Android-app (PWA) om krachttraining te plannen, uit te voeren en te loggen. Nu staat alles in notitie-app (notitie-app): het programma in *het programma*, de ladders in *Progressive overload*, de sessies op *Sessie A/B — krachtfase*, en de logs als vrije tekst (`Log::`). Doel: de app moet bruikbaar zijn vanaf de **krachtfase (Sessie B op 29 okt, Sessie A op 2 nov)**, met de bestaande oefeningen en ladders erin. de gebruiker heeft nog nooit geprogrammeerd. Ik leg dus elke stap uit en zeg telkens precies wat hij moet doen om te testen.

Gemaakte keuzes (uit de vragenrondes):
- Gemiste sessie: de app vraagt **Inhalen of Overslaan**. Bij inhalen blijft de rest van de planning op zijn dag, en de app waarschuwt als twee krachtsessies minder dan 48 uur uit elkaar liggen.
- Setvormen: supersets/circuits (notitie-app-"blokken" met A/B en rondes), finishers (AMRAP/EMOM), opwarmsets apart, unilateraal per kant.
- Kwaliteit per set: **Makkelijk / Controle / Gevecht**. Een set met *Gevecht* telt niet mee om een trede te klimmen.
- De notitie-app-data zo snel mogelijk importeren: oefeningen, ladders, Sessie A/B krachtfase als sjabloon, en de paar bestaande logs.
- Ontwikkeling volledig in de cloud (Claude Code-cloudsessie). Op de werklaptop kan zonder beheerdersrechten niets geïnstalleerd worden.
- GitHub Pages met de publieke repo `jornevanhee93/krachtlog`. De app komt op https://jornevanhee93.github.io/krachtlog/. De trainingsdata komt nooit in de repo.

## Stack (met reden)
- **Vite + React + TypeScript**: zoals voorgesteld.
- **Dexie** (IndexedDB) voor de opslag op het toestel.
- **vite-plugin-pwa** voor installeren en offline werken.
- **Zod** voor de JSON-validatie. Eén schema levert zowel de TypeScript-types als duidelijke foutmeldingen ("oefening 3: `repBereik` ontbreekt").
- **Recharts** voor de grafieken (simpel in React).
- **Vitest** voor de tests.
- **HashRouter**, omdat die zonder extra configuratie werkt op GitHub Pages.
- **Gewone CSS met variabelen** voor licht/donker, zonder Tailwind (minder gereedschap om te leren).
- Deploy via een **GitHub Action** bij elke push naar `main`.

## Datamodel (Dexie-tabellen)
- **equipment**: naam, soort (stang+schijven, dumbbell, kettlebell, zandzak, vest, elastiek, sled, macebell, box, overig), beschikbare gewichten of stappen (losse gewichten, schijven × aantal, instelbare stappen), notitie.
- **exercises**:
  - naam en aliassen (voor het koppelen bij import)
  - patronen[], spieren primair/secundair, materiaal-ids
  - `metingen` (welke velden gelogd worden: gewicht, extra last, variant, reps, tijd, afstand, in combinatie)
  - `unilateraal`
  - cues[], valkuilen[], notities, videolinks[], tags (bv. fun/finisher)
  - `progressie` (zie hieronder)
- **progressie** (zit in de oefening):
  - `modus`: `ladder` (expliciete treden zoals "BW → vest 5 → vest 10 → vest 10 + 3s excentrisch") of `last` (de treden volgen uit het materiaal, met de kleinste beschikbare stap)
  - `repBereik`, `doelRIR`, `sets`
  - `klim`: bovenkant gehaald in alle sets, beide kanten (de zwakke kant beslist), op de doel-RIR, geen Gevecht → één trede omhoog en terug naar de onderkant
  - `criterium` per soort: RIR (standaard), kwaliteit (power: 2× Makkelijk op rij), duur (isometrisch), afstand/houding (carry)
  - `stagnatie`: bv. 3 sessies zonder vooruitgang → 10% lichter, of alternatief voorstellen
  - `volgorde`: reps → last → set
  - De standaarden staan als data in de app (te bewerken), niet hard in de code.
- **templates** (sjablonen): naam, opwarming, groepen[]. Een groep heeft: label, type (`enkel` | `superset` | `circuit` | `amrap` | `emom`), rondes, rust tussen rondes/oefeningen, duur (voor AMRAP/EMOM) en items[] (oefening, sets, repBereik, doelRIR, rust, rol `anker`/`rotatie`, notitie).
- **sessions**: start/einde, duur, sessie-RPE, plezier 1–5, notitie, `soort: 'kracht'` (later ook `'loop'`), template- of programmabron.
- **entries** (één oefening binnen een sessie): sessionId, exerciseId, groep, volgorde, en sets[]. Een set heeft: `opwarm`, gewicht/extra last, trede of variant, reps (of links/rechts), tijd, afstand, RIR, kwaliteit, notitie. Entries zijn geïndexeerd op exerciseId, zodat historiek en grafieken per oefening snel laden.
- **programs** (fase 3): blokken → weken → sessies op vaste weekdagen, met items als in een sjabloon. **plannedSessions**: datum, programmasessie, status (`gepland` | `gedaan` | `overgeslagen` | `ingehaald`).
- **settings**: lichaamsgewicht (optioneel, voor een geschatte 1RM bij BW-oefeningen), datum van de laatste back-up, filosofie-standaarden.

## Schermen
- **Vandaag**: knop *Start sessie* (sjabloon of leeg). Vanaf fase 3 ook het voorstel van de dag en de vraag over gemiste sessies. Toont de back-upherinnering.
- **Training** (de actieve sessie):
  - Per oefening een kaart met de sets van de vorige keer al ingevuld.
  - Grote −/+ knoppen, RIR-knoppen 0–5, Makkelijk/Controle/Gevecht, en *Set klaar*.
  - Na *Set klaar* start de rusttimer (trillen + geluid, scherm blijft aan). In een superset springt de app daarna naar de volgende oefening van de groep.
  - Oefeningen toevoegen, vervangen of verwijderen kan tijdens de sessie. Bij het afsluiten vult de gebruiker RPE, plezier en een notitie in, en kan hij de sessie als sjabloon bewaren.
- **Oefeningen**: lijst met zoeken/filter op patroon; detail = overzichtspagina (fase 2: grafieken, ladderstap, voorstel); bewerken.
- **Materiaal**: de inventaris bewerken.
- **Historiek**: sessies met datum, duur, RPE en plezier.
- **Programma's** (fase 3).
- **Data**: back-up, herstel, import (bestand of plakken), export, opslagstatus.

## JSON-schema
`docs/schema.md` + `docs/voorbeelden/*.json`. Elk bestand heeft `schemaVersie` en `soort` (`backup` | `bibliotheek` | `programma` | `logs`). Versie 1 komt in fase 1 (bibliotheek, materiaal, sjablonen, logs, backup); de programma's volgen in fase 3. Bij import worden oefeningen gekoppeld op genormaliseerde naam/alias. Is er geen exacte match maar wel een gelijkaardige naam, dan vraagt de app: koppelen of nieuw?

## Fasen (elke fase eindigt met iets op de telefoon)
**Fase 0 — Opzet (±1 avond)**
- De repo bevat al `CLAUDE.md`, `docs/plan.md` (dit plan) en `docs/trainingsfilosofie.md`.
- In een cloudsessie komen erbij: het Vite-project, een lege app-shell met donkere modus en `navigator.storage.persist()`, en de GitHub Action voor Pages.
- Resultaat: een lege app staat online en is installeerbaar.

**Fase 1 — Loggen (klaar vóór 29 okt)**
- Materiaal, oefeningenbibliotheek, sjablonen.
- Een sessie loggen vanuit een sjabloon of ad hoc, met de vorige waarden al ingevuld, de rusttimer, opwarmsets, per kant, en supersets/AMRAP/EMOM.
- Schema v1, volledige back-up en herstel, import van de bibliotheek.
- **De notitie-app-import**: ik zet de oefeningen, de ladders (als data, het rekenwerk volgt in fase 2), het materiaal (een concept op basis van notitie-app, door de gebruiker te controleren), Sessie A/B krachtfase en de logs van aug–okt om naar een importbestand.
- Tests: import/export (validatie, round-trip back-up → herstel).

**Fase 2 — Progressie**
- Pure functies in `src/logic/` (geen UI):
  - de lastcalculator: haalbare lasten uit het materiaal, met de kleinste stap
  - de evaluatie van de laatste sessie tegen de regel of ladder
  - het voorstel (trede/last × reps @ RIR) met één regel uitleg
  - alternatieven als er geen stap is: reps, set, tempo, pauze, volgende variant
  - stagnatie
- Overzichtspagina per oefening:
  - grafieken van topset, volume, reps per variant, e1RM (Epley, alleen bij last + reps ≤ 12)
  - de ladderstap, de historiek, cues, video's en spieren
- In de training staat het doel van vandaag bij elke oefening.
- Tests: uitgebreide unittests van de progressielogica met de echte ladders als testgevallen (pull-up, bear hug squat, SL RDL).

**Fase 3 — Programma's**
- Schema v2 met programma's. Import via bestand of plakken, met duidelijke foutmeldingen.
- Op de vaste trainingsdagen het voorstel van de dag. De doelen volgen uit de laatste gelogde prestatie, niet uit het plan.
- Bij een gemiste sessie: Inhalen of Overslaan (de rest blijft staan, met de 48u-waarschuwing).
- Oefeningen aanpassen of vervangen in de geplande sessie. Labels anker/rotatie met een waarschuwing als een anker of rotatie zijn termijn overschrijdt.
- Tests: de planningslogica (gemist, inhalen, overslaan).

**Fase 4 — Afwerking**
- Logs exporteren (alles of een periode) + een compacte tekstsamenvatting voor een Claude-review (vervangt het lezen van de `Log::`-regels in notitie-app).
- De back-upherinnering na 7 dagen.
- UX-verfijning op basis van wat de gebruiker tijdens het trainen merkt.

Buiten scope: lopen (het datamodel laat het later toe via `sessions.soort`), sync/accounts, AI in de app.

## Conventies (komen in CLAUDE.md)
- Code en bestandsnamen in het Engels, de UI-teksten in het Nederlands, centraal in `src/i18n/nl.ts`.
- Logica in `src/logic/`, met tests ernaast (`*.test.ts`). Componenten blijven dom.
- Een commit na elke werkende stap, met een Nederlandse commitboodschap.
- Elke fase eindigt met een "Zo test je het"-blok in de chat.

## Verificatie
- `npm test` (Vitest) voor de logica en de import/export.
- `npm run build` en `npm run preview` in de cloudsessie, om te controleren dat de build werkt.
- Na een push naar `main`: de GitHub Action is groen en de app opent op https://jornevanhee93.github.io/krachtlog/.
- de gebruiker test elke fase op zijn telefoon:
  1. Open de link in Chrome → ⋮ → *Toevoegen aan startscherm*.
  2. Zet de vliegtuigmodus aan en open de app: hij moet werken.
  3. Log een testsessie, maak een back-up, wis de app-data en herstel.

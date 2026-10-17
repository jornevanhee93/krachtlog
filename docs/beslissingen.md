# Beslissingen zonder de gebruiker

Keuzes die eigenlijk bij de gebruiker liggen, maar tijdens de nachtbouw gemaakt moesten worden. Per keuze: de vraag, wat er gekozen is, waarom, en hoe je het verandert.

## Testen
- **Vraag:** end-to-endtests (Playwright) ook in de GitHub Action draaien?
- **Keuze:** nee, alleen lokaal/in de cloudsessie (`npm run e2e`). De Action draait de unittests en de build.
- **Waarom:** de browser in de Action installeren maakt elke deploy trager en kwetsbaarder; de logica en schermen zijn al gedekt door Vitest en React Testing Library.
- **Veranderen:** voeg in `.github/workflows/` een stap `npx playwright install chromium && npm run build && npm run e2e` toe (en zet `PW_CHROMIUM` leeg).

## Privacy
- **Vraag:** oude vermeldingen van de notitie-app staan nog in de git-geschiedenis. Herschrijven?
- **Keuze:** nee. De huidige bestanden zijn schoon; de geschiedenis herschrijven vraagt een force-push op `main` (risico voor de deploy en bestaande clones).
- **Veranderen:** kan later met `git filter-repo` door de eigenaar zelf, als hij dat wil.

## Progressie (fase 2)
- **Vraag:** welke regel geldt als een oefening een profiel heeft én een eigen klimregel?
- **Keuze:** een eigen klimregel (iets anders dan de standaard "RIR, 1 sessie") gaat voor; anders gelden de profielstandaarden uit Instellingen.
- **Veranderen:** `regelsVoor` in `src/logic/progression.ts`.

- **Vraag:** wat doet de app bij stilstand?
- **Keuze:** anker (en oefeningen zonder profiel): lichter (in modus last x% lichter, in een ladder één trede terug). Andere profielen: voorstel om te wisselen binnen het patroon. Een eigen `stagnatie` bij de oefening gaat voor. "Stilstand" = de laatste N keer op dezelfde trede/last, nooit gehaald, en geen beter resultaat (totaal reps, duur of afstand) dan de eerste van die N.
- **Veranderen:** `isGestagneerd` en `regelsVoor` in `src/logic/progression.ts`; N en % in Data → Instellingen.

- **Vraag:** wanneer telt power als "strak"?
- **Keuze:** alle werksets met kwaliteit *Makkelijk*, zoveel keer op rij als Instellingen zegt (standaard 2). RIR telt niet bij power.

- **Vraag:** carry en isometrisch?
- **Keuze:** carry: geen Gevecht (houding) → bovenkant van het afstandsbereik in alle sets → zwaarder. Isometrisch: bovenkant van het duurbereik in alle sets (RIR 0 telt niet: nooit tot falen) → volgende trede (hefboom) of zwaarder.

- **Vraag:** vult de app het voorstel ook al in bij de start van een training?
- **Keuze:** ja, maar alleen bij klimmen of lichter (nieuwe trede/last, reps naar het doel). Bij herhalen blijven de waarden van de vorige keer staan, met het doel als tekst op de kaart.
- **Veranderen:** `pasVoorstelToe` in `src/logic/activeSession.ts`.

- **Vraag:** e1RM bij een gewichtsvest?
- **Keuze:** alleen als je lichaamsgewicht is ingevuld (Data → Instellingen); dan telt lichaamsgewicht + vest. Anders geen e1RM-grafiek.

## Programma's (fase 3)
- **Vraag:** hoe ver terug vraagt de app naar gemiste sessies?
- **Keuze:** 14 dagen. Oudere niet-gedane sessies tellen als verlopen (geen vraag meer), zodat het Vandaag-scherm niet volloopt.
- **Veranderen:** `GEMIST_VENSTER_DAGEN` in `src/logic/planning.ts`.

- **Vraag:** wanneer begint week 1?
- **Keuze:** de week (maandag–zondag) van de startdatum; sessies vóór de startdatum vallen weg.

- **Vraag:** hoe rekent de 48u-waarschuwing zonder uur?
- **Keuze:** een geplande sessie zonder `tijd` krijgt hetzelfde uur als het moment van inhalen. Gelogde loopsessies tellen niet. De drempel staat in Instellingen.
- **Veranderen:** `botsingen48u` in `src/logic/planning.ts`.

- **Vraag:** de termijn van een anker/rotatie: waarop meet je?
- **Keuze:** per programma, van de eerste tot de laatste week waarin de oefening met die rol gepland staat (overgeslagen sessies tellen niet). Het programmascherm waarschuwt als het plan te lang is; Vandaag waarschuwt als het nu al te lang loopt.

- **Vraag:** een programma opnieuw importeren?
- **Keuze:** zelfde naam = vervangen met hetzelfde id; de status van geplande sessies (gedaan, overgeslagen, aanpassingen) blijft gekoppeld via "<programma>:<week>:<sessie>". Verandert de structuur van het programma, dan kan een status bij een andere sessie terechtkomen.

## Fixronde 17 okt
- **Vraag:** wat gebeurt er met gedane sets als je tijdens de training een oefening vervangt?
- **Keuze:** gedane sets gaan nooit verloren. Is er al een set afgevinkt, dan blijft de oude oefening staan (dicht, met het label "vervangen" en alleen haar gedane sets) en komt de nieuwe oefening er meteen achter met de resterende sets (in een superset: de resterende rondes). Zonder gedane sets wordt de oefening gewoon vervangen. Er komt geen extra vraag: dit is de veiligste en eenvoudigste optie.
- **Veranderen:** `vervangOefening` in `src/logic/activeSession.ts`.

- **Vraag:** waarom werd "Copenhagen plank" bij een programma-import stil gekoppeld aan "Copenhagen dips"?
- **Oorzaak:** een gedeelde alias telde als exacte match. Beide oefeningen hadden de alias "Copenhagen"; de app koppelde dan zonder te vragen en zette "Copenhagen plank" bij de aliassen.
- **Keuze:** automatisch koppelen alleen als de *naam* uit het bestand de naam of een alias van precies één bestaande oefening is (of omgekeerd: de bestaande naam staat bij de aliassen in het bestand). Een gedeelde alias, een gelijkaardige naam of meerdere exacte matches → altijd vragen, voor bibliotheek, logs en programma. Er is geen voorkeuze meer ("koppelen" stond vooraf aangevinkt); importeren kan pas na een keuze bij elke vraag.
- **Veranderen:** `zoekMatch` in `src/logic/matching.ts`; de vraag staat in `ImportPlanView` in `src/screens/DataScreen.tsx`.
- **Let op:** "Copenhagen plank" staat op je telefoon misschien nog als alias bij "Copenhagen dips". Haal die alias weg via Oefeningen → Copenhagen dips → Bewerken als ze er niet hoort.

- **Vraag:** wat bewaart "Bewaar als sjabloon" bij het afsluiten, en onder welke naam?
- **Keuze:** de volledige structuur van de sessie zoals ze er bij het afsluiten uitziet: alle groepen (type, rondes, rust, duur) en alle oefeningen, ook die zonder gedane sets, met hun voorschrift (sets, repbereik, RIR, rust, rol, last, notitie). Een oefening die vervangen werd valt weg; de vervanger krijgt haar voorschrift. Bestaat de naam al, dan stelt de app een vrije naam voor ("Sessie A (aangepast)", daarna "(aangepast 2)" …). Typ je zelf een bestaande naam, dan kies je: als nieuw sjabloon (vrije naam, standaard) of het bestaande vervangen.
- **Veranderen:** `naarSjabloon` en `vrijeSjabloonNaam` in `src/logic/activeSession.ts`; de keuze staat in `src/screens/training/FinishSheet.tsx`.

- **Vraag:** op welke trede staat een set zonder `trede` (bv. geïmporteerd)?
- **Keuze:** op de trede waarvan de last (gewicht, extra last, variant, tempo) overeenkomt. Passen er meerdere treden (bv. BW 15 → BW 20 → BW 25, allemaal lichaamsgewicht), dan de `huidigeTrede` als die erbij is, anders de laagste die past. Past er geen, dan de `huidigeTrede`; pas als die ontbreekt de onderste trede.
- **Veranderen:** `tredeVanSet` in `src/logic/progression.ts`.

- **Vraag:** welke alternatieven stelt de app voor als er geen gewone stap is?
- **Keuze:** volgens het profiel. Power: complexiteit, volgende variant, zwaarder, pauze (nooit meer reps, trager tempo of een extra set). Carry: houding, afstand, last. Isometrisch: duur, hefboom, last. Anker/opbouw/geen profiel: de volgorde van de oefening plus reps, set, tempo, pauze, variant. "Meer reps boven het bereik" alleen als de bovenkant van het bereik al gehaald werd (niet bij stilstand onderaan, bv. vast op 6 bij 6–8). "Zwaarder" valt weg als het materiaal geen zwaardere stap heeft. Een eigen volgorde bij de oefening gaat voor de profielvolgorde.
- **Veranderen:** `PROFIEL_STAPPEN` en `alternatieven` in `src/logic/progression.ts`.

- **Vraag:** wat doet een anker in stilstand op de laagste trede van zijn ladder (er is geen trede terug)?
- **Keuze:** heeft die trede een last (gewicht of extra last) en laat het materiaal een lichtere last toe, dan stelt de app die voor met de lastcalculator: de zwaarste haalbare last op of onder −10% (het percentage uit Instellingen), anders de eerstvolgende lichtere. De trede blijft dezelfde, alleen de last zakt. Is er geen lichtere last (bv. lichaamsgewicht, of al de lichtste kettlebell), dan blijft het een alternatief. Let op: met vaste gewichten kan de stap groter zijn dan 10% (bv. 24 → 16 kg als er niets tussen ligt).
- **Veranderen:** het stilstandsblok in `maakVoorstel` (`src/logic/progression.ts`).

- **Vraag:** met welke duur of afstand start je na een klim (isometrisch, carry)?
- **Keuze:** zoals bij reps: na een klim of een stap lichter terug naar de onderkant van het duur- of afstandsbereik (van de nieuwe trede als die een eigen bereik heeft). Het voorstel, de uitleg ("terug naar 30 s") en de voorgevulde set gebruiken dezelfde waarde. Bij herhalen blijft de bovenkant het doel.
- **Veranderen:** `onderaan` in `src/logic/progression.ts` en `pasVoorstelToe` in `src/logic/activeSession.ts`.

- **Vraag:** hoe log je tijd en afstand bij een unilaterale oefening?
- **Keuze:** per kant, zoals reps: **Tijd links / Tijd rechts** (en **Afstand links / rechts**). Schema v4 met `duurSecLinks`, `duurSecRechts`, `afstandMLinks`, `afstandMRechts`; de zwakke kant beslist in de progressie. Oudere sets met één `duurSec` of `afstandM` blijven geldig en tellen gewoon mee; in een nieuwe training worden ze als dezelfde waarde voor beide kanten voorgevuld. Databaseversie 3 verandert niets aan bestaande gegevens (geen nieuwe indexen). v1–v3-bestanden blijven importeerbaar.
- **Veranderen:** `duurVan`/`afstandVan` in `src/logic/progression.ts`, `zetPerKant` in `src/logic/activeSession.ts`, `SetEditor`.

- **Vraag:** wat staat er in het veld "Trede" als de vorige sets geen trede hadden?
- **Keuze:** de trede van het voorstel, anders de huidige trede van de oefening. Alleen het label (en de variant/het tempo als die nog leeg waren) wordt ingevuld; gewicht en reps van de vorige keer blijven staan.
- **Veranderen:** `vulTrede` in `src/logic/activeSession.ts`.

- **Vraag:** wanneer toont de app het tredelabel naast de last?
- **Keuze:** alleen als het iets toevoegt: "24 kg" naast "24 kg × 6" valt weg, "Vest 5" naast "+5 kg × 7" blijft. Spaties, "kg", "+" en komma/punt tellen niet mee bij het vergelijken. De tekst voor een review (Logs exporteren) houdt het label wel, als kop tussen haken.
- **Veranderen:** `tredeVoegtToe` in `src/logic/format.ts`.

- **Vraag:** hoe filter je compact op patroon bij Oefeningen?
- **Keuze:** één keuzelijst "Patroon" (standaard "Alle patronen") in plaats van een rij knoppen per patroon. Eén rij hoog, nooit breder dan het scherm, en de keuzelijst van Android is groot genoeg om met één hand te tikken.

- **Vraag:** hoe voorkom je dat de onderbalk een knop bedekt bij automatisch scrollen?
- **Keuze:** `scroll-padding-bottom` op de pagina (hoogte van de onderbalk + marge, en met de rustbalk erbij nog eens zoveel extra). De bestaande ruimte onder de inhoud blijft. Zo houdt de browser bij focus of automatisch scrollen altijd ruimte vrij.
- **Veranderen:** bovenaan en bij "Training" in `src/index.css`.


## Verbetering 1: een set afvinken in één tik
- **Vraag:** hoe ziet de open oefening eruit in de training?
- **Keuze:** bovenaan de open kaart staat voor de huidige set een blok met (van boven naar onder) het setnummer en een kleine knop **Aanpassen**, de kwaliteit (Makkelijk/Controle/Gevecht, optioneel), de RIR (0–5) en een grote volle knop met de samenvatting, bv. "✓ 80 kg × 8 · RIR 2". Eén tik = "Set klaar" met die waarden; de rusttimer en de superset-flow zijn ongewijzigd. Het volledige invulblok (trede, gewicht, reps …) staat standaard dicht.
- **RIR:** voorgevuld met de doel-RIR van het sjabloon, anders van de oefening. Zonder doel-RIR is er geen keuze voorgeselecteerd en wordt er ook geen RIR bewaard. Een RIR per kant (uit een import) blijft onaangeroerd. Bij power en opwarmsets: geen RIR (opwarmsets ook geen kwaliteit).
- **Duim:** bij het openen van een kaart scrollt de app zo dat de knop onderaan in beeld komt, met ruimte voor de onderbalk en voor de rustbalk die na de tik verschijnt. Staat de kaart helemaal bovenaan de pagina, dan kan de knop iets hoger staan.
- **Aanpassen:** "Aanpassen" (of een tik op de huidige set in de lijst) opent het invulblok voor de huidige set, met dezelfde RIR als de knop. "Inklappen" sluit het weer. Een gedane set is een compacte regel; een tik erop opent het invulblok van die set.
- **Veranderen:** `snelleRir`, `snelleSet` en `snelKlaar` in `src/logic/activeSession.ts`; de knop staat in `src/screens/training/ExerciseCard.tsx`.

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


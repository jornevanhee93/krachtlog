# JSON-schema v3

Dit is het bestandsformaat voor back-up, herstel en import van Emerge. De Zod-schema's in `src/schema/` zijn de bron; dit document legt ze uit. Voorbeelden (met verzonnen data) staan in `docs/voorbeelden/`:

- [`bibliotheek.json`](voorbeelden/bibliotheek.json): materiaal, oefeningen met ladders, en een sjabloon met superset, circuit en EMOM
- [`logs.json`](voorbeelden/logs.json): gelogde sessies, met opwarmsets, links/rechts en een EMOM
- [`programma.json`](voorbeelden/programma.json): een programma met 2 blokken, herhaalde weken en een deloadweek
- [`backup.json`](voorbeelden/backup.json): een volledige back-up

## Algemene regels

- Elk bestand is één JSON-object met bovenaan **`schemaVersie`** (nu `3`; bestanden met versie `1` of `2` worden nog altijd aanvaard en automatisch omgezet) en **`soort`**: `"backup"`, `"bibliotheek"`, `"logs"` of `"programma"`.
- Optioneel: `gemaaktOp` (datum+tijd, bv. `"2026-10-16T20:00:00Z"`) en `bron` (vrije tekst, bv. `"export notitie-app 16 okt"`).
- **Veldnamen zijn exact.** Een onbekend veld (bv. een tikfout als `repbereik`) geeft een fout en wordt dus niet stil genegeerd.
- Velden die hier "optioneel" heten mag je weglaten. Velden met een standaardwaarde krijgen die als je ze weglaat.
- **Getallen** schrijf je zonder aanhalingstekens, met een punt als decimaalteken: `2.5`, niet `"2,5"`.
- **Datums**: `"2026-10-29"` (alleen datum) of `"2026-10-29T18:30"` (met tijd; seconden en tijdzone mogen: `"2026-10-29T18:30:00+01:00"`).
- **Gewichten** in kg, **duur** in seconden, **afstand** in meter.
- **Bereiken** (repBereik e.d.) zijn altijd een object: `{ "min": 8, "max": 12 }`. Een vast aantal: `{ "min": 5, "max": 5 }`.
- **Ids** zijn vrije, niet-lege tekst, uniek per soort binnen het bestand. Gebruik leesbare ids, bv. `"oef-pull-up"`, `"mat-vest"`, `"sjab-sessie-b-kracht"`, `"ses-2026-09-03"`.
- **Verwijzingen** (`oefeningId`, `materiaalIds`, `materiaalId`, `sjabloonId`) moeten bestaan **in hetzelfde bestand**. Een bestand is dus altijd op zichzelf compleet.
- Er komt nooit echte trainingsdata in de repo; de voorbeelden zijn verzonnen.

## Soorten bestanden

| soort | bevat | gebruik |
|---|---|---|
| `bibliotheek` | `materiaal[]`, `oefeningen[]`, `sjablonen[]` (alle drie optioneel, standaard `[]`) | Je bibliotheek importeren of aanvullen |
| `logs` | `oefeningen[]`, `sessies[]` | Gelogde sessies importeren |
| `programma` | `oefeningen[]`, `programma` | Een programma importeren |
| `backup` | `instellingen`, `materiaal[]`, `oefeningen[]`, `sjablonen[]`, `sessies[]`, `programmas[]`, `planning[]` | Volledige back-up en herstel |

In een `logs`- of `programma`-bestand moet elke oefening waarnaar een sessie verwijst ook in `oefeningen` staan. Daar volstaat `id` en `naam` (eventueel `aliassen` en `unilateraal`); de app koppelt ze bij import aan de bibliotheek (zie *Koppelen bij import*).

## materiaal

| veld | type | |
|---|---|---|
| `id` | tekst | verplicht |
| `naam` | tekst | verplicht |
| `soort` | `stang` · `dumbbell` · `kettlebell` · `zandzak` · `vest` · `elastiek` · `sled` · `macebell` · `box` · `overig` | verplicht |
| `gewichten` | object (zie hieronder) | optioneel |
| `notitie` | tekst | optioneel |

`gewichten` heeft een `type`:

- `{ "type": "vast", "kg": [12, 16, 24] }`: losse vaste gewichten (kettlebells, dumbbells met vast gewicht, zandzakken)
- `{ "type": "schijven", "stangKg": 20, "schijven": [{ "kg": 10, "aantal": 2 }, …] }`: stang met schijven; `aantal` = totaal aantal stuks van dat gewicht
- `{ "type": "instelbaar", "minKg": 0, "maxKg": 20, "stapKg": 2.5 }`: instelbaar in vaste stappen (vest, instelbare dumbbell)
- `{ "type": "standen", "standen": ["licht", "medium", "zwaar"] }`: benoemde standen zonder kg (elastieken)

## oefeningen

| veld | type | standaard |
|---|---|---|
| `id` | tekst | verplicht |
| `naam` | tekst | verplicht |
| `aliassen` | tekst[]: andere namen, voor het koppelen (bv. `"SL RDL"`) | `[]` |
| `patronen` | tekst[]: bv. `hinge`, `squat`, `lunge`, `push-horizontaal`, `push-verticaal`, `pull-horizontaal`, `pull-verticaal`, `carry`, `rotatie`, `anti-rotatie`, `plyometrie`, `core` | `[]` |
| `spieren` | `{ "primair": tekst[], "secundair": tekst[] }` | leeg |
| `materiaalIds` | id[] uit `materiaal` | `[]` |
| `metingen` | welke velden je per set logt: `gewicht` · `extraLast` · `variant` · `reps` · `tijd` · `afstand` | `["gewicht", "reps"]` |
| `unilateraal` | true/false: per kant loggen | `false` |
| `cues`, `valkuilen`, `tags` | tekst[] (tags bv. `"fun"`, `"finisher"`) | `[]` |
| `notities` | tekst | optioneel |
| `videolinks` | links (https://…) | `[]` |
| `progressie` | object (zie hieronder) | optioneel |
| `icoon` | `lichaamsgewicht` · `zandzak` · `kettlebell` · `dumbbell` · `stang` · `vest` · `macebell` · `box` · `elastiek` · `sled` (sinds v2). Weglaten = automatisch: het icoon van het eerste materiaal; geen materiaal (of `overig`) = `lichaamsgewicht` | optioneel |
| `gearchiveerd` | true/false | `false` |

### progressie

De ladder of de regel waarmee de oefening progressie maakt. Het rekenwerk komt in fase 2; in v1 wordt dit alleen bewaard.

| veld | type | |
|---|---|---|
| `modus` | `"ladder"` (expliciete treden) of `"last"` (de treden volgen uit het materiaal) | verplicht |
| `profiel` | `anker` · `opbouw` · `power` · `carry` · `isometrisch` (zie trainingsfilosofie; de standaarden per profiel staan in de instellingen) | optioneel |
| `repBereik` | bereik | optioneel |
| `duurBereikSec` | bereik in seconden (isometrisch) | optioneel |
| `afstandBereikM` | bereik in meter (carry) | optioneel |
| `doelRIR` | getal 0–10: de RIR-vloer, niet lager gaan dan dit | optioneel |
| `sets` | geheel getal ≥ 1 | optioneel |
| `treden` | trede[], **van laag naar hoog**; verplicht (minstens één) bij `modus: "ladder"` | `[]` |
| `huidigeTrede` | label van de trede waar je nu zit | optioneel |
| `kleinsteStapKg` | bij `modus: "last"`, als de kleinste stap afwijkt van het materiaal | optioneel |
| `klim` | `{ "criterium": "rir" \| "kwaliteit" \| "duur" \| "afstand", "sessiesOpRij": 1 }` | `{ "criterium": "rir", "sessiesOpRij": 1 }` |
| `stagnatie` | `{ "sessies": 3, "actie": "lichter" \| "alternatief" \| "wisselen", "percentage": 10 }` | optioneel |
| `volgorde` | volgorde waarin je progressie zoekt: `reps` · `last` · `sets` · `tempo` · `pauze` · `variant` · `duur` · `afstand` · `houding` · `hefboom` · `complexiteit` | `["reps", "last", "sets"]` |

Een **trede**:

| veld | type | |
|---|---|---|
| `label` | tekst, uniek binnen de ladder (hoofdletters tellen niet) | verplicht |
| `last` | lastspec (zie hieronder) | `{}` = lichaamsgewicht |
| `repBereik` | eigen repbereik voor deze trede | optioneel |
| `duurBereikSec`, `afstandBereikM` | eigen bereik | optioneel |
| `notitie` | tekst | optioneel |

Een **lastspec** (alle velden optioneel):

| veld | betekenis |
|---|---|
| `gewichtKg` | gewicht in kg (dumbbells/kettlebells: per stuk) |
| `extraKg` | extra last, bv. het vest |
| `variant` | vrije tekst: `"BW"`, `"ring"`, `"deficit"`, `"elastiek groen"`, `"voet op bank"` … |
| `tempo` | bv. `"3-1-1-0"` of `"3s excentrisch"` |
| `duurSec` | duur in seconden |
| `afstandM` | afstand in meter |
| `materiaalId` | welk materiaal |

**Voorbeeld van een ladder** (pull-up: BW → vest 5 → vest 10 → vest 10 + 3s excentrisch):

```json
"progressie": {
  "modus": "ladder",
  "profiel": "anker",
  "repBereik": { "min": 5, "max": 8 },
  "doelRIR": 2,
  "sets": 3,
  "treden": [
    { "label": "BW", "last": { "variant": "BW" } },
    { "label": "Vest 5", "last": { "extraKg": 5 } },
    { "label": "Vest 10", "last": { "extraKg": 10 } },
    { "label": "Vest 10 + 3s excentrisch", "last": { "extraKg": 10, "tempo": "3s excentrisch" }, "repBereik": { "min": 4, "max": 6 } }
  ],
  "huidigeTrede": "Vest 5",
  "stagnatie": { "sessies": 3, "actie": "lichter", "percentage": 10 }
}
```

## sjablonen

| veld | type | |
|---|---|---|
| `id` | tekst | verplicht |
| `naam` | tekst, bv. `"Sessie B — krachtfase"` | verplicht |
| `notitie` | tekst | optioneel |
| `opwarming` | tekst[]: één regel per stap | `[]` |
| `groepen` | groep[] (minstens één) | verplicht |

Een **groep** (een "blok" in je notities, bv. A1/A2 als superset):

| veld | type | |
|---|---|---|
| `label` | tekst, bv. `"A"`, `"B"`, `"Finisher"` | optioneel |
| `type` | `enkel` · `superset` · `circuit` · `amrap` · `emom` | `"enkel"` |
| `rondes` | geheel getal ≥ 1 | `1` |
| `rustTussenRondesSec` | seconden | optioneel |
| `rustTussenOefeningenSec` | seconden | optioneel |
| `duurSec` | totale duur voor AMRAP/EMOM | optioneel |
| `intervalSec` | EMOM: lengte van één interval (meestal 60) | optioneel |
| `notitie` | tekst | optioneel |
| `items` | item[] (minstens één) | verplicht |

Een **item**:

| veld | type | |
|---|---|---|
| `oefeningId` | id uit `oefeningen` | verplicht |
| `sets` | geheel getal ≥ 1 (bij `enkel`; in een superset/circuit tellen de `rondes`) | optioneel |
| `repBereik` | bereik | optioneel |
| `doelRIR` | getal 0–10 | optioneel |
| `rustSec` | rust na deze oefening, in seconden | optioneel |
| `rol` | `"anker"` of `"rotatie"` | optioneel |
| `last` | lastspec: voorgeschreven last of variant (vanaf fase 2 rekent de app dit zelf uit) | optioneel |
| `notitie` | tekst | optioneel |

## sessies (logs)

| veld | type | |
|---|---|---|
| `id` | tekst | verplicht |
| `soort` | `"kracht"` (later ook `"loop"`) | `"kracht"` |
| `start` | datum of datum+tijd | verplicht |
| `einde` | datum of datum+tijd, niet vóór `start` | optioneel |
| `duurMin` | minuten | optioneel |
| `rpe` | sessie-RPE 0–10 | optioneel |
| `plezier` | geheel getal 1–5 | optioneel |
| `notitie` | tekst | optioneel |
| `sjabloonId` | id van het sjabloon (alleen gecontroleerd in een back-up) | optioneel |
| `planningId` | de geplande sessie uit een programma waaruit deze sessie gestart werd (sinds v3) | optioneel |
| `bron` | bv. `"notities"` | optioneel |
| `oefeningen` | sessie-oefening[] | `[]` |

Een **sessie-oefening**:

| veld | type | |
|---|---|---|
| `oefeningId` | id uit `oefeningen` van hetzelfde bestand | verplicht |
| `volgorde` | 0, 1, 2 … | verplicht |
| `groep` | label van de groep, bv. `"A"`; oefeningen met hetzelfde label vormen samen de groep | optioneel |
| `groepType` | `enkel` · `superset` · `circuit` · `amrap` · `emom` | optioneel |
| `notitie` | tekst | optioneel |
| `sets` | set[] in de volgorde waarin ze gedaan zijn | `[]` |

Een **set** (alle velden optioneel; vul in wat je weet):

| veld | betekenis |
|---|---|
| `opwarm` | true voor een opwarmset (standaard false); opwarmsets tellen niet mee voor progressie |
| `gewichtKg`, `extraKg` | last in kg |
| `trede` | label van de ladder-trede |
| `variant`, `tempo` | tekst |
| `reps` | aantal reps (bilateraal) |
| `repsLinks`, `repsRechts` | reps per kant (unilateraal) |
| `duurSec`, `afstandM` | duur / afstand |
| `rir` | RIR 0–10 (of `rirLinks` / `rirRechts` per kant) |
| `kwaliteit` | `"makkelijk"` · `"controle"` · `"gevecht"` |
| `ronde` | bij AMRAP/EMOM/circuit: in welke ronde of minuut (1, 2, 3 …) |
| `notitie` | tekst |

Een AMRAP leg je vast als sets met `ronde`; het aantal rondes is de hoogste `ronde`, een onvolledige laatste ronde heeft gewoon minder reps.

## programma (sinds v3)

Een programma bestaat uit **blokken → weken → sessies op vaste weekdagen**. Een sessie heeft dezelfde `groepen` als een sjabloon (met per item `sets`, `repBereik`, `doelRIR`, `rustSec`, `rol` en `notitie`).

| veld | type | |
|---|---|---|
| `id` | tekst | verplicht |
| `naam` | tekst; een programma met dezelfde naam wordt bij import vervangen (wat je al deed blijft bewaard) | verplicht |
| `startDatum` | datum, bv. `"2026-10-26"`. Week 1 is de week (ma–zo) waarin deze dag valt; sessies vóór de startdatum vallen weg | verplicht |
| `notitie` | tekst | optioneel |
| `blokken` | blok[] (minstens één) | verplicht |

Een **blok**: `naam` (verplicht), `notitie`, `weken` (week[], minstens één).

Een **week**:

| veld | type | |
|---|---|---|
| `label` | tekst, bv. `"Deload"` | optioneel |
| `herhaal` | hoeveel keer deze week na elkaar komt | `1` |
| `notitie` | tekst | optioneel |
| `sessies` | sessie[] | `[]` |

Een **sessie** in een week:

| veld | type | |
|---|---|---|
| `naam` | tekst, bv. `"Sessie A"` | verplicht |
| `weekdag` | `ma` · `di` · `wo` · `do` · `vr` · `za` · `zo` | verplicht |
| `tijd` | uur, bv. `"18:30"` (voor de 48u-waarschuwing) | optioneel |
| `notitie` | tekst | optioneel |
| `opwarming` | tekst[] | `[]` |
| `groepen` | groep[] zoals bij sjablonen (minstens één) | verplicht |

**Hoe de app het plan gebruikt.** De doelen volgen uit wat je de vorige keer echt deed (en het voorstel), niet uit het plan; het plan geeft de structuur (welke oefeningen, sets, bereik, RIR, rust). Een gemiste sessie (tot 14 dagen terug) kun je **inhalen** of **overslaan**; de rest van de planning blijft op zijn dag. De app waarschuwt als twee krachtsessies minder dan 48 uur (instelbaar) uit elkaar liggen, en als een `anker` (6–12 weken) of `rotatie` (2–6 weken) langer in het programma staat dan zijn termijn.

### planning (alleen in een back-up)

De toestand van geplande sessies waar iets mee gebeurd is:

| veld | type | |
|---|---|---|
| `id` | `"<programmaId>:<week>:<sessie>"` (week vanaf 1, sessie vanaf 0 binnen de week) | verplicht |
| `programmaId` | id uit `programmas` | verplicht |
| `datum` | de oorspronkelijke datum | verplicht |
| `status` | `gepland` · `gedaan` · `overgeslagen` · `ingehaald` | verplicht |
| `sessieId` | de gelogde sessie | optioneel |
| `op` | wanneer ingehaald | optioneel |
| `aanpassing` | `{ "groepen": [...] }`: aangepaste oefeningen voor deze ene sessie | optioneel |

## instellingen (alleen in een back-up)

| veld | type |
|---|---|
| `lichaamsgewichtKg` | getal, optioneel |
| `laatsteBackup` | datum+tijd, optioneel |
| `filosofie` | de bewerkbare standaardwaarden uit `docs/trainingsfilosofie.md`; ontbrekende velden krijgen de standaard |

`filosofie` bevat: `termijnen` (`ankerWeken`, `rotatieWeken`, `microblokWeken`, `rotatiePercentage` als bereiken), `rirVloeren` (`onderlichaam`, `bovenlichaam`, `bovenlichaamIntensivering`, `klein`), `stagnatie` (`sessies`, `lichterPercentage`, `irritatieSessies`), `profielen` (per profiel `criterium`, `sessiesOpRij`, optioneel `stagnatieSessies` en `stagnatiePercentage`) en `planning` (`minUrenTussenKracht`, `backupHerinneringDagen`). Zie `src/schema/settings.ts` voor de standaardwaarden.

## Koppelen bij import

Bij een import van `bibliotheek`, `logs` of `programma` worden de oefeningen uit het bestand gekoppeld aan de oefeningen die al in de app staan:

1. **Exacte match** (genormaliseerd: kleine letters, zonder accenten, leestekens en dubbele spaties; `"SL-RDL"` = `"sl rdl"`) → automatisch gekoppeld. Exact betekent: de **naam** uit het bestand is de naam of een alias van de bestaande oefening, of de **naam** van de bestaande oefening staat bij de aliassen in het bestand. En dat met precies één bestaande oefening.
2. **Gelijkaardig** → de app vraagt altijd: *koppelen* of *nieuw* (er is geen voorkeuze; importeren kan pas als je overal gekozen hebt). Dat geldt voor een gelijkaardige naam, voor twee oefeningen die alleen een alias delen (bv. `"Copenhagen"` bij zowel "Copenhagen plank" als "Copenhagen dips"), en als de naam exact past bij meer dan één bestaande oefening.
3. **Geen match** → nieuwe oefening.

De ids in het bestand zijn alleen geldig binnen het bestand; de app vertaalt ze bij het koppelen. Materiaal en sjablonen worden op dezelfde manier gekoppeld op naam.

Een **back-up herstellen** vervangt alles op het toestel door de inhoud van het bestand (na bevestiging).

## Foutmeldingen

De app toont bij een fout het pad en wat er mis is, bv.:

- `oefeningen[1] (Pull-up).progressie.repBereik.max: "min" mag niet groter zijn dan "max"`
- `sessies[0] (ses-2026-09-03).oefeningen[0] (oef-squat).oefeningId: oefening "oef-squat" bestaat niet in "oefeningen"`
- `oefeningen[0] (Squat): onbekend veld "repbereik" (tikfout? zie docs/schema.md)`

Tellen begint bij 0: `oefeningen[1]` is de tweede oefening.

## Versies

| versie | wijziging |
|---|---|
| 1 | eerste versie: backup, bibliotheek, logs |
| 2 | oefeningen: optioneel veld `icoon`. Een v1-bestand is ongewijzigd geldig. |
| 3 | nieuwe soort `programma`; in een back-up `programmas` en `planning` (standaard leeg); sessies: optioneel `planningId`. Een v2-bestand is ongewijzigd geldig. |

Wijzigt het schema, dan gaat `schemaVersie` omhoog en zet de app oudere bestanden automatisch om (`src/schema/migrate.ts`). Een bestand met een hogere versie dan de app kent, wordt geweigerd.

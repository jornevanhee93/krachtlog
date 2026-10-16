# Trainingsfilosofie

Dit document beschrijft de principes achter de app. De app codeert ze niet hard waar dat niet nodig is: de getallen hieronder (termijnen, RIR-vloeren, stagnatiedrempels) zijn **standaardwaarden** die in de app als bewerkbare data staan. Pas je hier iets aan, dan pas je het ook in de app aan (Instellingen → Filosofie, vanaf fase 2).

Bron: de projectbeschrijving en de eigen progressieregels van de gebruiker, stand 16 okt 2026.

## Uitgangspunten
- **Geïnspireerd op StrongFit (Julien Pineau).** Herhaling is een feature, en variatie zit eerder in de belasting dan in de oefeningskeuze. Dit is een coachingsmodel, geen peer-reviewed onderzoek.
- **Bewegingspatronen gaan voor vaste oefeningen.** Een oefening is een invulling van een patroon (hinge, squat, lunge, push, pull, carry, rotatie, plyometrie …).
- **Ankers en rotatie.**
  - Ankeroefeningen: 6–12 weken. Ankers wisselen nooit binnen een blok.
  - Rotatie-oefeningen: 2–6 weken.
  - Microblokken van 4–6 weken, met 20–40% rotatie op de blokgrenzen.
- **Autoregulatie via RIR** (reps in reserve: hoeveel je er nog bij had gekund).
- **Hybride atleet.** De gebruiker loopt ook, dus het volume voor het onderlichaam blijft conservatief (stimulus-to-fatigue). Lopen zit niet in versie 1, maar het datamodel laat het later toe.
- **Evidence-based, maar plezier telt mee.** Er is plaats voor fun-oefeningen en finishers, en de plezierscore is zichtbaar in de historiek.

## Progressie
- **Hoofdregel:** bovenkant van het repbereik, alle sets, beide kanten, op de doel-RIR → één trede omhoog, terug naar de onderkant. Nooit omdat de kalender het zegt.
- **Volgorde:** eerst reps, dan last, pas als laatste een extra set. Sets zijn de duurste munt van een hybride atleet.
- **Eerlijkheid is het mechanisme.** Een set met kwaliteit *Gevecht* (of echte RIR 0) telt niet mee om te klimmen.
- **Kwaliteit per set:** Makkelijk / Controle / Gevecht.
- **Unilateraal:** de zwakke kant beslist.
- **Kleinste stap:** voorstellen nemen de kleinste stap die het materiaal toelaat. Is er geen haalbare stap, dan een alternatief: extra reps, een extra set, tempo, een pauze of de volgende variant op de ladder.

### Per soort oefening (standaard)
| Soort | Klimt op | Opmerking |
|---|---|---|
| Anker | hoofdregel, streng | stokt 3 sessies → 10% lichter, opnieuw opbouwen |
| Opbouw | hoofdregel | mag eerst reps verzamelen over de sets als de laststap te groot is |
| Power | kwaliteit → complexiteit → last | nooit op RIR; 2 sessies op rij strak |
| Carry | houding → afstand → last | |
| Isometrisch | duur → hefboom → last | nooit tot falen |

### RIR-vloeren (standaard)
- Onderlichaam nooit onder RIR 2.
- Bovenlichaam RIR 2; alleen in een intensiveringsfase naar 1–2.
- Kleine stabiliserende oefeningen (adductoren, kuiten, heupbuigers): RIR 3 / 2–3.

### Wisselen (niet-ankers, binnen hetzelfde patroon)
- Bij 3 sessies stilstand.
- Bij 2 sessies gewrichtsirritatie → meteen wisselen.
- Bij een andere rem dan de doelspier (bv. grip).
- Bij een geplande wissel op een blokgrens.
- Na een wissel start de teller opnieuw: dat is geen verlies.

## Deload
Alleen op signaal, nooit op de kalender. Er is een deload nodig bij twee of meer van deze signalen tegelijk:
- prestaties twee sessies op rij lager bij gelijke gewichten
- een voorgeschreven RIR 2 die twee keer in een week RIR 0 blijkt
- een loop die in de eerste 20' al zwaar voelt
- spierpijn die 72u+ blijft hangen
- slaap of rusthartslag duidelijk slechter

Dan volgt één week waarin:
- de laatste ronde van elk blok wegvalt (−30–40%)
- de gewichten gelijk blijven
- de power gehalveerd wordt, maar strak blijft

## Planning
- **Gemiste sessie:** de app vraagt *Inhalen* of *Overslaan*. Bij inhalen blijft de rest van de planning op zijn dag. De app waarschuwt als twee krachtsessies minder dan 48 uur uit elkaar liggen.
- **De volgende sessie vertrekt van wat je écht gedaan hebt:** doelen volgen uit de laatst gelogde prestatie, niet uit het oorspronkelijke plan.

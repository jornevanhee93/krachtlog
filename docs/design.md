# Stijlgids Emerge

Zo clean mogelijk: minimalistisch, rustig en **puur zwart-wit**. De tokens staan als CSS-variabelen bovenaan `src/index.css`; gebruik in componenten altijd een token, nooit een losse kleur of maat.

## Kleur
| token | licht | donker | gebruik |
|---|---|---|---|
| `--bg` | wit | zwart | achtergrond |
| `--fg` | zwart | wit | tekst, randen van knoppen, actieve toestand |
| `--muted` | grijs | grijs | alleen secundaire tekst (labels, uitleg, niet-actieve items) |
| `--line` | lichtgrijs | donkergrijs | alleen dunne lijnen (1px) |

- Er is **geen accentkleur**. Licht of donker volgt de instelling van de telefoon (`prefers-color-scheme`).
- Geen gekleurde vlakken, geen schaduwen, geen verlopen.

## Status zonder kleur
| betekenis | hoe |
|---|---|
| hoofdactie | volle knop (`.btn-primary`: `--fg` als vlak, `--bg` als tekst) |
| gekozen / actief | vol vlak (keuzeknoppen, chips) of vet + lijn eronder (tabs, onderbalk) |
| klaar | vinkje ✓ en tekst in `--fg` (nog niet klaar: `--muted`) |
| aandacht / fout | vet, een `!` ervoor, een 2px lijn (`--border-strong`) |
| gevaarlijke actie | omlijnde knop met stippellijn (`.btn-danger`) **en** altijd een bevestiging |
| tijd om (rust, AMRAP/EMOM) | omgekeerd: `--fg` als vlak, `--bg` als tekst |

## Letters
Eén familie: `system-ui`. Weinig maten:
- `--fs-small` labels en uitleg
- `--fs-body` gewone tekst
- `--fs-title` paginatitel
- `--fs-number` gewicht, reps, timers in de training
- `--fs-timer` de rusttimer

Cijfers die veranderen krijgen `font-variant-numeric: tabular-nums`, zodat ze niet verspringen.

## Ruimte en vorm
- Ruimte in stappen: `--s1` 4px, `--s2` 8px, `--s3` 16px, `--s4` 24px, `--s5` 40px. Liever te veel witruimte dan te weinig.
- Randen: `--border` (1px `--line`) of alleen een scheidingslijn tussen rijen. Lijsten zijn rijen met een lijn, geen kaders.
- Hoekstraal: `--radius` (8px).
- Knoppen en tikvlakken: minstens `--tap` (48px) hoog. Met één hand te bedienen; de belangrijkste knop staat onderaan.

## Layout
- Mobile-first, getest op 375px breed. Nooit horizontaal scrollen: tekst mag afkappen (`text-overflow: ellipsis`) of omlopen, maar niets mag uit beeld lopen.
- Maximaal 640px breed op grotere schermen.
- Alle teksten staan in `src/i18n/nl.ts`.

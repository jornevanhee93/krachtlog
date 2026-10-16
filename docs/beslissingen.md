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

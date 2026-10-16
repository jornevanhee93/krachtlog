// Alle UI-teksten van de app, centraal op één plek.
export const nl = {
  appName: 'Krachtlog',
  nav: {
    today: 'Vandaag',
    exercises: 'Oefeningen',
    history: 'Historiek',
    data: 'Data',
  },
  today: {
    title: 'Vandaag',
    placeholder: 'Hier start je straks een sessie, vanuit een sjabloon of leeg.',
  },
  exercises: {
    title: 'Oefeningen',
    placeholder: 'Hier komt je oefeningenbibliotheek, met zoeken en filteren op patroon.',
  },
  history: {
    title: 'Historiek',
    placeholder: 'Hier verschijnen je gelogde sessies, met duur, RPE en plezier.',
  },
  data: {
    title: 'Data',
    storageTitle: 'Opslag op dit toestel',
    storageStatus: {
      persisted: 'Blijvende opslag: aan',
      notPersisted: 'Blijvende opslag: uit',
      unsupported: 'Blijvende opslag: niet ondersteund',
      checking: 'Opslagstatus controleren…',
    },
    storageExplain: {
      persisted:
        'Chrome bewaart je gegevens op dit toestel en wist ze niet vanzelf, ook niet als de opslag bijna vol is. Alleen jij kunt ze wissen (bv. via "Gegevens wissen" in de app-instellingen). Maak toch regelmatig een back-up.',
      notPersisted:
        'Chrome mag je gegevens wissen als het toestel weinig vrije ruimte heeft. Tip: installeer de app op je startscherm en open hem een paar keer; Chrome geeft dan meestal blijvende opslag. Maak tot dan zeker regelmatig een back-up.',
      unsupported:
        'Deze browser kan geen blijvende opslag aanvragen. Je gegevens staan wel op het toestel, maar maak regelmatig een back-up.',
    },
    usage: (usedMb: string, quotaMb: string) => `Gebruikt: ${usedMb} MB van ongeveer ${quotaMb} MB`,
    retry: 'Opnieuw aanvragen',
    backupPlaceholder: 'Back-up, herstel en import komen in de volgende stap.',
  },
  pwa: {
    updateAvailable: 'Er is een nieuwe versie van Krachtlog.',
    update: 'Bijwerken',
    offlineReady: 'Krachtlog werkt nu ook offline.',
    close: 'Sluiten',
  },
} as const;

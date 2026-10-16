import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseBestand, parseObject } from './parseFile';

const voorbeeld = (naam: string) => readFileSync(new URL(`../../docs/voorbeelden/${naam}.json`, import.meta.url), 'utf8');

function fouten(input: unknown) {
  const res = parseObject(input);
  if (res.ok) throw new Error('verwachtte fouten');
  return res.fouten;
}

describe('voorbeeldbestanden in docs/voorbeelden', () => {
  it.each(['bibliotheek', 'logs', 'backup'])('%s.json is geldig', (naam) => {
    const res = parseBestand(voorbeeld(naam));
    if (!res.ok) throw new Error(JSON.stringify(res.fouten, null, 2));
    expect(res.soort).toBe(naam);
  });

  it('vult standaardwaarden in', () => {
    const res = parseBestand(voorbeeld('bibliotheek'));
    if (!res.ok || res.soort !== 'bibliotheek') throw new Error('ongeldig');
    const swing = res.bestand.oefeningen.find((o) => o.id === 'oef-kb-swing')!;
    expect(swing.unilateraal).toBe(false);
    expect(swing.aliassen).toEqual([]);
    const rdl = res.bestand.oefeningen.find((o) => o.id === 'oef-sl-rdl')!;
    expect(rdl.progressie?.volgorde).toEqual(['reps', 'last', 'sets']);
    expect(rdl.progressie?.klim).toEqual({ criterium: 'rir', sessiesOpRij: 1 });
  });

  it('vult de filosofie-standaarden aan in een back-up', () => {
    const res = parseObject({ schemaVersie: 2, soort: 'backup' });
    if (!res.ok || res.soort !== 'backup') throw new Error('ongeldig');
    expect(res.bestand.instellingen.filosofie.stagnatie.sessies).toBe(3);
    expect(res.bestand.instellingen.filosofie.planning.minUrenTussenKracht).toBe(48);
    expect(res.bestand.instellingen.filosofie.profielen.power).toEqual({ criterium: 'kwaliteit', sessiesOpRij: 2 });
  });
});

describe('foutmeldingen', () => {
  it('meldt ongeldige JSON', () => {
    const res = parseBestand('{ kapot');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.fouten[0].bericht).toMatch(/geen geldige JSON/);
  });

  it('meldt een onbekende of ontbrekende soort', () => {
    expect(fouten({ schemaVersie: 2, soort: 'iets' })[0]).toMatchObject({ pad: 'soort' });
    expect(fouten({ schemaVersie: 1 })[0]).toMatchObject({ pad: 'soort' });
  });

  it('weigert een nieuwere schemaVersie', () => {
    expect(fouten({ schemaVersie: 99, soort: 'logs' })[0].bericht).toMatch(/schemaVersie 99/);
  });

  it('geeft het pad met de naam van de oefening', () => {
    const f = fouten({
      schemaVersie: 2,
      soort: 'bibliotheek',
      oefeningen: [
        { id: 'a', naam: 'Squat' },
        { id: 'b', naam: 'Pull-up', progressie: { modus: 'last', repBereik: { min: 10, max: 5 } } },
      ],
    });
    expect(f).toEqual([
      { pad: 'oefeningen[1] (Pull-up).progressie.repBereik.max', bericht: '"min" mag niet groter zijn dan "max"' },
    ]);
  });

  it('meldt een ontbrekend verplicht veld en een onbekend veld', () => {
    const f = fouten({ schemaVersie: 2, soort: 'bibliotheek', oefeningen: [{ id: 'a', repbereik: 5 }] });
    expect(f).toContainEqual({ pad: 'oefeningen[0] (a).naam', bericht: 'ontbreekt (verplicht veld)' });
    expect(f.some((x) => x.bericht.includes('"repbereik"'))).toBe(true);
  });

  it('meldt een verwijzing naar een onbekende oefening', () => {
    const f = fouten({
      schemaVersie: 2,
      soort: 'logs',
      oefeningen: [{ id: 'a', naam: 'Squat' }],
      sessies: [{ id: 's1', start: '2026-09-01', oefeningen: [{ oefeningId: 'x', volgorde: 0 }] }],
    });
    expect(f).toEqual([
      { pad: 'sessies[0] (s1).oefeningen[0] (x).oefeningId', bericht: 'oefening "x" bestaat niet in "oefeningen"' },
    ]);
  });

  it('controleert de ladder: treden nodig, labels uniek, huidige trede bestaat', () => {
    const f = fouten({
      schemaVersie: 2,
      soort: 'bibliotheek',
      oefeningen: [
        { id: 'a', naam: 'A', progressie: { modus: 'ladder' } },
        {
          id: 'b',
          naam: 'B',
          progressie: { modus: 'ladder', treden: [{ label: 'BW' }, { label: 'bw' }], huidigeTrede: 'Vest' },
        },
      ],
    });
    expect(f.map((x) => x.pad)).toEqual([
      'oefeningen[0] (A).progressie.treden',
      'oefeningen[1] (B).progressie.treden[1] (bw).label',
      'oefeningen[1] (B).progressie.huidigeTrede',
    ]);
  });

  it('meldt dubbele ids en een ongeldige datum', () => {
    const f = fouten({
      schemaVersie: 2,
      soort: 'logs',
      sessies: [
        { id: 's', start: '29-10-2026' },
        { id: 's', start: '2026-10-29' },
      ],
    });
    expect(f.map((x) => x.pad)).toEqual(['sessies[0] (s).start', 'sessies[1] (s).id']);
  });

  it('geeft Nederlandse meldingen voor fout type en enum', () => {
    const f = fouten({
      schemaVersie: 2,
      soort: 'logs',
      sessies: [{ id: 's', start: '2026-10-29', plezier: 7, oefeningen: [{ oefeningId: 'a', volgorde: 0, sets: [{ kwaliteit: 'zwaar', reps: '8' }] }] }],
      oefeningen: [{ id: 'a', naam: 'A' }],
    });
    expect(f).toContainEqual({ pad: 'sessies[0] (s).plezier', bericht: 'plezier gaat van 1 tot 5' });
    expect(f).toContainEqual({
      pad: 'sessies[0] (s).oefeningen[0] (a).sets[0].kwaliteit',
      bericht: 'kies "makkelijk", "controle" of "gevecht"',
    });
    const reps = f.find((x) => x.pad.endsWith('sets[0].reps'));
    expect(reps?.bericht).toMatch(/getal|number/i);
  });
});

describe('programmabestand: duidelijke foutmeldingen', () => {
  const basis = {
    schemaVersie: 3,
    soort: 'programma',
    oefeningen: [{ id: 'sq', naam: 'Squat' }],
    programma: {
      id: 'p',
      naam: 'Blok',
      startDatum: '2026-10-26',
      blokken: [{ naam: 'B1', weken: [{ sessies: [{ naam: 'A', weekdag: 'ma', groepen: [{ items: [{ oefeningId: 'sq' }] }] }] }] }],
    },
  };
  const met = (fn: (b: typeof basis) => void) => {
    const b = structuredClone(basis);
    fn(b);
    return parseObject(b);
  };

  it('een geldig programma', () => {
    expect(parseObject(basis).ok).toBe(true);
  });
  it('een verkeerde weekdag', () => {
    const r = met((b) => ((b.programma.blokken[0].weken[0].sessies[0] as { weekdag: string }).weekdag = 'maandag'));
    expect(!r.ok && r.fouten[0]).toMatchObject({ pad: expect.stringContaining('weekdag'), bericht: expect.stringMatching(/"ma", "di"/) });
  });
  it('een onbekende oefening', () => {
    const r = met((b) => (b.programma.blokken[0].weken[0].sessies[0].groepen[0].items[0].oefeningId = 'dl'));
    expect(!r.ok && r.fouten[0].bericht).toMatch(/oefening "dl" bestaat niet/);
  });
  it('een ongeldige startdatum en een tijd', () => {
    const r = met((b) => {
      b.programma.startDatum = '26/10/2026';
      (b.programma.blokken[0].weken[0].sessies[0] as { tijd?: string }).tijd = '7u';
    });
    expect(!r.ok && r.fouten.map((f) => f.bericht).join(' ')).toMatch(/"2026-10-26".*"18:30"|"18:30".*"2026-10-26"/);
  });
});

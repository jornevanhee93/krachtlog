import { z } from 'zod';
import { id, lastSpec, metersRange, positiveCount, repRange, rir, secondsRange, tekstLijst } from './common';

/** Welke velden er per set gelogd worden. */
export const meting = z.enum(['gewicht', 'extraLast', 'variant', 'reps', 'tijd', 'afstand'], {
  error: 'kies uit gewicht, extraLast, variant, reps, tijd, afstand',
});

/** Standaardprofiel uit de trainingsfilosofie; de standaardwaarden per profiel staan in de instellingen. */
export const profiel = z.enum(['anker', 'opbouw', 'power', 'carry', 'isometrisch'], {
  error: 'kies uit anker, opbouw, power, carry, isometrisch',
});

export const trede = z.strictObject({
  /** Korte naam van de trede, uniek binnen de ladder, bv. "Vest 10 kg". */
  label: z.string().trim().min(1, 'label ontbreekt'),
  last: lastSpec.default({}),
  /** Optioneel eigen repbereik voor deze trede (anders dat van de progressie). */
  repBereik: repRange.optional(),
  duurBereikSec: secondsRange.optional(),
  afstandBereikM: metersRange.optional(),
  notitie: z.string().optional(),
});
export type Trede = z.infer<typeof trede>;

export const klimCriterium = z.enum(['rir', 'kwaliteit', 'duur', 'afstand'], {
  error: 'kies uit rir, kwaliteit, duur, afstand',
});

export const PROGRESSIE_STAPPEN = [
  'reps', 'last', 'sets', 'tempo', 'pauze', 'variant', 'duur', 'afstand', 'houding', 'hefboom', 'complexiteit',
] as const;
export const progressieStap = z.enum(PROGRESSIE_STAPPEN, {
  error: `kies uit ${PROGRESSIE_STAPPEN.join(', ')}`,
});

export const progressie = z
  .strictObject({
    /** ladder = expliciete treden; last = de treden volgen uit het materiaal. */
    modus: z.enum(['ladder', 'last'], { error: 'modus moet "ladder" of "last" zijn' }),
    profiel: profiel.optional(),
    repBereik: repRange.optional(),
    duurBereikSec: secondsRange.optional(),
    afstandBereikM: metersRange.optional(),
    /** Doel-RIR: de vloer, je gaat niet lager dan dit. */
    doelRIR: rir.optional(),
    sets: positiveCount.optional(),
    /** De treden van laag naar hoog (verplicht bij modus "ladder"). */
    treden: z.array(trede).default([]),
    /** Label van de trede waar je nu zit (bv. bij import uit notitie-app). */
    huidigeTrede: z.string().trim().min(1).optional(),
    /** Bij modus "last": de kleinste stap in kg, als die afwijkt van het materiaal. */
    kleinsteStapKg: z.number().positive().optional(),
    klim: z
      .strictObject({
        criterium: klimCriterium.default('rir'),
        /** Hoeveel sessies op rij het criterium gehaald moet worden (power: 2). */
        sessiesOpRij: positiveCount.default(1),
      })
      .default({ criterium: 'rir', sessiesOpRij: 1 }),
    stagnatie: z
      .strictObject({
        /** Na hoeveel sessies zonder vooruitgang. */
        sessies: positiveCount,
        actie: z.enum(['lichter', 'alternatief', 'wisselen'], {
          error: 'kies uit lichter, alternatief, wisselen',
        }),
        /** Bij "lichter": hoeveel procent lichter. */
        percentage: z.number().min(0).max(100).optional(),
      })
      .optional(),
    /** In welke volgorde je progressie zoekt. */
    volgorde: z.array(progressieStap).min(1).default(['reps', 'last', 'sets']),
  })
  .superRefine((p, ctx) => {
    if (p.modus === 'ladder' && p.treden.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['treden'], message: 'een ladder heeft minstens één trede nodig' });
    }
    const seen = new Set<string>();
    p.treden.forEach((t, i) => {
      const key = t.label.toLowerCase();
      if (seen.has(key)) {
        ctx.addIssue({ code: 'custom', path: ['treden', i, 'label'], message: `label "${t.label}" komt twee keer voor` });
      }
      seen.add(key);
    });
    if (p.huidigeTrede && !p.treden.some((t) => t.label.toLowerCase() === p.huidigeTrede!.toLowerCase())) {
      ctx.addIssue({
        code: 'custom',
        path: ['huidigeTrede'],
        message: `er is geen trede met label "${p.huidigeTrede}"`,
      });
    }
  });
export type Progressie = z.infer<typeof progressie>;

export const oefening = z.strictObject({
  id,
  naam: z.string().trim().min(1, 'naam ontbreekt'),
  /** Andere namen, voor het koppelen bij import (bv. "SL RDL"). */
  aliassen: tekstLijst,
  /** Bewegingspatronen, bv. "hinge", "squat", "pull-verticaal". */
  patronen: tekstLijst,
  spieren: z
    .strictObject({ primair: tekstLijst, secundair: tekstLijst })
    .default({ primair: [], secundair: [] }),
  materiaalIds: z.array(id).default([]),
  metingen: z.array(meting).min(1, 'kies minstens één meting').default(['gewicht', 'reps']),
  unilateraal: z.boolean().default(false),
  cues: tekstLijst,
  valkuilen: tekstLijst,
  notities: z.string().optional(),
  videolinks: z.array(z.url({ error: 'geen geldige link' })).default([]),
  /** Vrije labels, bv. "fun", "finisher". */
  tags: tekstLijst,
  progressie: progressie.optional(),
  gearchiveerd: z.boolean().default(false),
});
export type Oefening = z.infer<typeof oefening>;

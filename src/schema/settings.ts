import { z } from 'zod';
import { isoDateTime, kg, positiveCount, range, rir } from './common';

const weken = range(z.number().min(0));
const procent = range(z.number().min(0).max(100));

const profielStandaard = z.strictObject({
  criterium: z.enum(['rir', 'kwaliteit', 'duur', 'afstand']),
  sessiesOpRij: positiveCount,
  stagnatieSessies: positiveCount.optional(),
  stagnatiePercentage: z.number().min(0).max(100).optional(),
});

/**
 * De trainingsprincipes als bewerkbare standaardwaarden (zie docs/trainingsfilosofie.md).
 * Ontbrekende velden krijgen de standaardwaarde.
 */
export const filosofie = z.strictObject({
  termijnen: z
    .strictObject({
      ankerWeken: weken.default({ min: 6, max: 12 }),
      rotatieWeken: weken.default({ min: 2, max: 6 }),
      microblokWeken: weken.default({ min: 4, max: 6 }),
      rotatiePercentage: procent.default({ min: 20, max: 40 }),
    })
    .prefault({}),
  rirVloeren: z
    .strictObject({
      onderlichaam: rir.default(2),
      bovenlichaam: rir.default(2),
      bovenlichaamIntensivering: rir.default(1),
      klein: rir.default(2),
    })
    .prefault({}),
  stagnatie: z
    .strictObject({
      sessies: positiveCount.default(3),
      lichterPercentage: z.number().min(0).max(100).default(10),
      irritatieSessies: positiveCount.default(2),
    })
    .prefault({}),
  profielen: z
    .strictObject({
      anker: profielStandaard.default({ criterium: 'rir', sessiesOpRij: 1, stagnatieSessies: 3, stagnatiePercentage: 10 }),
      opbouw: profielStandaard.default({ criterium: 'rir', sessiesOpRij: 1 }),
      power: profielStandaard.default({ criterium: 'kwaliteit', sessiesOpRij: 2 }),
      carry: profielStandaard.default({ criterium: 'afstand', sessiesOpRij: 1 }),
      isometrisch: profielStandaard.default({ criterium: 'duur', sessiesOpRij: 1 }),
    })
    .prefault({}),
  planning: z
    .strictObject({
      minUrenTussenKracht: z.number().min(0).default(48),
      backupHerinneringDagen: positiveCount.default(7),
      /** Sinds schemaVersie 5: herinnering na zoveel nieuwe sessies sinds de laatste back-up. */
      backupHerinneringSessies: positiveCount.default(3),
    })
    .prefault({}),
});
export type Filosofie = z.infer<typeof filosofie>;

export const instellingen = z.strictObject({
  lichaamsgewichtKg: kg.optional(),
  laatsteBackup: isoDateTime.optional(),
  filosofie: filosofie.prefault({}),
});
export type Instellingen = z.infer<typeof instellingen>;

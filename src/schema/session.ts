import { z } from 'zod';
import { count, id, isoDateOrDateTime, kg, kwaliteit, meters, positiveCount, rir, seconds } from './common';
import { groepType } from './template';

export const set = z.strictObject({
  opwarm: z.boolean().default(false),
  gewichtKg: kg.optional(),
  extraKg: kg.optional(),
  /** Label van de ladder-trede. */
  trede: z.string().trim().min(1).optional(),
  variant: z.string().trim().min(1).optional(),
  tempo: z.string().trim().min(1).optional(),
  /** Reps (bij unilateraal: gebruik repsLinks en repsRechts). */
  reps: count.optional(),
  repsLinks: count.optional(),
  repsRechts: count.optional(),
  duurSec: seconds.optional(),
  afstandM: meters.optional(),
  rir: rir.optional(),
  rirLinks: rir.optional(),
  rirRechts: rir.optional(),
  kwaliteit: kwaliteit.optional(),
  /** Bij AMRAP/EMOM/circuit: in welke ronde of minuut. */
  ronde: positiveCount.optional(),
  notitie: z.string().optional(),
});
export type LogSet = z.infer<typeof set>;

/** Eén oefening binnen een sessie. */
export const sessieOefening = z.strictObject({
  oefeningId: id,
  /** Label van de groep, bv. "A". Oefeningen met hetzelfde label vormen samen de groep. */
  groep: z.string().trim().min(1).optional(),
  groepType: groepType.optional(),
  /** Volgorde in de sessie (0, 1, 2 …). */
  volgorde: count,
  notitie: z.string().optional(),
  sets: z.array(set).default([]),
});
export type SessieOefening = z.infer<typeof sessieOefening>;

export const sessie = z
  .strictObject({
    id,
    soort: z.enum(['kracht', 'loop'], { error: 'soort moet "kracht" of "loop" zijn' }).default('kracht'),
    start: isoDateOrDateTime,
    einde: isoDateOrDateTime.optional(),
    duurMin: z.number().min(0).optional(),
    /** Sessie-RPE 0–10. */
    rpe: z.number().min(0).max(10, 'RPE gaat van 0 tot 10').optional(),
    /** Plezier 1–5. */
    plezier: z.number().int().min(1, 'plezier gaat van 1 tot 5').max(5, 'plezier gaat van 1 tot 5').optional(),
    notitie: z.string().optional(),
    sjabloonId: id.optional(),
    /** Waar de sessie vandaan komt, bv. "notities". */
    bron: z.string().optional(),
    oefeningen: z.array(sessieOefening).default([]),
  })
  .refine((s) => !s.einde || s.einde >= s.start, { message: 'einde ligt vóór start', path: ['einde'] });
export type Sessie = z.infer<typeof sessie>;

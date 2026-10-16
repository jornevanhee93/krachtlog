import { z } from 'zod';
import { id, lastSpec, positiveCount, repRange, rir, seconds, tekstLijst } from './common';

export const groepType = z.enum(['enkel', 'superset', 'circuit', 'amrap', 'emom'], {
  error: 'kies uit enkel, superset, circuit, amrap, emom',
});
export type GroepType = z.infer<typeof groepType>;

export const sjabloonItem = z.strictObject({
  oefeningId: id,
  sets: positiveCount.optional(),
  repBereik: repRange.optional(),
  doelRIR: rir.optional(),
  /** Rust na deze oefening, in seconden. */
  rustSec: seconds.optional(),
  rol: z.enum(['anker', 'rotatie'], { error: 'rol moet "anker" of "rotatie" zijn' }).optional(),
  /** Voorgeschreven last of variant (optioneel; vanaf fase 2 rekent de app dit zelf uit). */
  last: lastSpec.optional(),
  notitie: z.string().optional(),
});
export type SjabloonItem = z.infer<typeof sjabloonItem>;

export const sjabloonGroep = z.strictObject({
  /** Bv. "A", "B", "Finisher". */
  label: z.string().trim().min(1).optional(),
  type: groepType.default('enkel'),
  rondes: positiveCount.default(1),
  rustTussenRondesSec: seconds.optional(),
  rustTussenOefeningenSec: seconds.optional(),
  /** Totale duur voor AMRAP/EMOM, in seconden. */
  duurSec: seconds.optional(),
  /** EMOM: lengte van één interval in seconden (standaard 60). */
  intervalSec: seconds.optional(),
  notitie: z.string().optional(),
  items: z.array(sjabloonItem).min(1, 'een groep heeft minstens één oefening nodig'),
});
export type SjabloonGroep = z.infer<typeof sjabloonGroep>;

export const sjabloon = z.strictObject({
  id,
  naam: z.string().trim().min(1, 'naam ontbreekt'),
  notitie: z.string().optional(),
  /** Opwarming als lijst van regels tekst. */
  opwarming: tekstLijst,
  groepen: z.array(sjabloonGroep).min(1, 'een sjabloon heeft minstens één groep nodig'),
});
export type Sjabloon = z.infer<typeof sjabloon>;

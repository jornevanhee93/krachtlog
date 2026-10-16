import { z } from 'zod';

// Bouwstenen die in meerdere schema's terugkomen.

export const id = z.string().trim().min(1, 'mag niet leeg zijn');

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/;

function isValidDate(value: string): boolean {
  return !Number.isNaN(new Date(value.length === 10 ? `${value}T00:00:00` : value).getTime());
}

/** Een datum (JJJJ-MM-DD) of een datum met tijd (JJJJ-MM-DDTUU:MM, eventueel met seconden en tijdzone). */
export const isoDateOrDateTime = z
  .string()
  .refine((v) => (ISO_DATE.test(v) || ISO_DATETIME.test(v)) && isValidDate(v), {
    message: 'verwacht een datum als "2026-10-29" of "2026-10-29T18:30"',
  });

/** Een datum met tijd, voor tijdstempels die de app zelf zet. */
export const isoDateTime = z.string().refine((v) => ISO_DATETIME.test(v) && isValidDate(v), {
  message: 'verwacht een datum met tijd als "2026-10-29T18:30:00Z"',
});

export const kg = z.number().min(0, 'mag niet negatief zijn');
export const count = z.number().int('moet een geheel getal zijn').min(0, 'mag niet negatief zijn');
export const positiveCount = z.number().int('moet een geheel getal zijn').min(1, 'moet minstens 1 zijn');
export const seconds = z.number().min(0, 'mag niet negatief zijn');
export const meters = z.number().min(0, 'mag niet negatief zijn');
export const rir = z.number().min(0, 'mag niet negatief zijn').max(10, 'mag niet hoger zijn dan 10');

/** Een bereik zoals 8–12 reps: { "min": 8, "max": 12 }. */
export function range(value: z.ZodNumber) {
  return z
    .strictObject({ min: value, max: value })
    .refine((r) => r.min <= r.max, { message: '"min" mag niet groter zijn dan "max"', path: ['max'] });
}

export const repRange = range(count);
export const secondsRange = range(seconds);
export const metersRange = range(meters);

export const tekstLijst = z.array(z.string().trim().min(1, 'mag niet leeg zijn')).default([]);

/**
 * Lastspec: hoe zwaar of welke variant. Alle velden zijn optioneel;
 * een lege lastspec ({}) betekent lichaamsgewicht zonder extra last.
 */
export const lastSpec = z.strictObject({
  /** Gewicht in kg (bij dumbbells/kettlebells: per stuk). */
  gewichtKg: kg.optional(),
  /** Extra last in kg, bv. het gewichtsvest. */
  extraKg: kg.optional(),
  /** Vrije omschrijving van de variant, bv. "BW", "ring", "deficit", "elastiek groen". */
  variant: z.string().trim().min(1).optional(),
  /** Tempo, bv. "3-1-1-0" of "3s excentrisch". */
  tempo: z.string().trim().min(1).optional(),
  /** Duur in seconden (isometrisch, hang, plank …). */
  duurSec: seconds.optional(),
  /** Afstand in meter (carry, sled …). */
  afstandM: meters.optional(),
  /** Welk materiaal (id uit "materiaal"). */
  materiaalId: id.optional(),
});
export type LastSpec = z.infer<typeof lastSpec>;

export const kwaliteit = z.enum(['makkelijk', 'controle', 'gevecht'], {
  error: 'kies "makkelijk", "controle" of "gevecht"',
});
export type Kwaliteit = z.infer<typeof kwaliteit>;

import { z } from 'zod';
import { id, isoDateOrDateTime, positiveCount, tekstLijst } from './common';
import { sjabloonGroep } from './template';

export const WEEKDAGEN = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'] as const;
export const weekdag = z.enum(WEEKDAGEN, { error: 'weekdag moet "ma", "di", "wo", "do", "vr", "za" of "zo" zijn' });
export type Weekdag = z.infer<typeof weekdag>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
/** Alleen een datum, bv. "2026-10-26". */
export const isoDate = z
  .string()
  .refine((v) => ISO_DATE.test(v) && !Number.isNaN(new Date(`${v}T00:00:00`).getTime()), {
    message: 'verwacht een datum als "2026-10-26"',
  });

/** Eén sessie in een programmaweek, op een vaste weekdag. De groepen zijn dezelfde als in een sjabloon. */
export const programmaSessie = z.strictObject({
  naam: z.string().trim().min(1, 'naam ontbreekt'),
  weekdag,
  /** Optioneel uur, bv. "18:30" (voor de 48u-waarschuwing). */
  tijd: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'verwacht een uur als "18:30"')
    .optional(),
  notitie: z.string().optional(),
  opwarming: tekstLijst,
  groepen: z.array(sjabloonGroep).min(1, 'een sessie heeft minstens één groep nodig'),
});
export type ProgrammaSessie = z.infer<typeof programmaSessie>;

export const programmaWeek = z.strictObject({
  /** Bv. "Week 1" of "Deload". */
  label: z.string().trim().min(1).optional(),
  /** Hoeveel keer deze week na elkaar komt (standaard 1). */
  herhaal: positiveCount.default(1),
  notitie: z.string().optional(),
  sessies: z.array(programmaSessie).default([]),
});
export type ProgrammaWeek = z.infer<typeof programmaWeek>;

export const programmaBlok = z.strictObject({
  naam: z.string().trim().min(1, 'naam ontbreekt'),
  notitie: z.string().optional(),
  weken: z.array(programmaWeek).min(1, 'een blok heeft minstens één week nodig'),
});
export type ProgrammaBlok = z.infer<typeof programmaBlok>;

export const programma = z.strictObject({
  id,
  naam: z.string().trim().min(1, 'naam ontbreekt'),
  /** De eerste dag van het programma. Week 1 is de week (ma–zo) waarin deze dag valt. */
  startDatum: isoDate,
  notitie: z.string().optional(),
  blokken: z.array(programmaBlok).min(1, 'een programma heeft minstens één blok nodig'),
});
export type Programma = z.infer<typeof programma>;

/** De toestand van één geplande sessie (alleen bewaard als er iets gebeurd is). */
export const planStatus = z.strictObject({
  /** Sleutel van de geplande sessie: "<programmaId>:<week>:<sessie>". */
  id: z.string().trim().min(1),
  programmaId: id,
  /** De oorspronkelijke datum. */
  datum: isoDate,
  status: z.enum(['gepland', 'gedaan', 'overgeslagen', 'ingehaald'], {
    error: 'status moet "gepland", "gedaan", "overgeslagen" of "ingehaald" zijn',
  }),
  /** De gelogde sessie (bij gedaan of ingehaald). */
  sessieId: id.optional(),
  /** Wanneer ingehaald. */
  op: isoDateOrDateTime.optional(),
  /** Aangepaste oefeningen voor deze ene geplande sessie. */
  aanpassing: z.strictObject({ groepen: z.array(sjabloonGroep).min(1) }).optional(),
});
export type PlanStatus = z.infer<typeof planStatus>;

import { z } from 'zod';
import { count, id, kg } from './common';

export const materiaalSoort = z.enum(
  ['stang', 'dumbbell', 'kettlebell', 'zandzak', 'vest', 'elastiek', 'sled', 'macebell', 'box', 'overig'],
  { error: 'onbekende soort; kies uit stang, dumbbell, kettlebell, zandzak, vest, elastiek, sled, macebell, box, overig' },
);

/** Welke gewichten of standen het materiaal toelaat. */
export const gewichten = z.discriminatedUnion(
  'type',
  [
    // Losse vaste gewichten, bv. kettlebells van 12, 16 en 24 kg.
    z.strictObject({ type: z.literal('vast'), kg: z.array(kg).min(1, 'geef minstens één gewicht') }),
    // Stang met schijven: het gewicht van de stang en welke schijven je hebt (totaal aantal stuks).
    z.strictObject({
      type: z.literal('schijven'),
      stangKg: kg,
      schijven: z.array(z.strictObject({ kg: kg, aantal: count })).min(1, 'geef minstens één schijf'),
    }),
    // Instelbaar in vaste stappen, bv. een vest van 0 tot 20 kg per 2,5 kg.
    z.strictObject({
      type: z.literal('instelbaar'),
      minKg: kg,
      maxKg: kg,
      stapKg: z.number().positive('moet groter dan 0 zijn'),
    }),
    // Benoemde standen zonder kg, bv. elastieken "licht", "medium", "zwaar".
    z.strictObject({ type: z.literal('standen'), standen: z.array(z.string().trim().min(1)).min(1) }),
  ],
  { error: 'type moet "vast", "schijven", "instelbaar" of "standen" zijn' },
);

export const materiaal = z.strictObject({
  id,
  naam: z.string().trim().min(1, 'naam ontbreekt'),
  soort: materiaalSoort,
  gewichten: gewichten.optional(),
  notitie: z.string().optional(),
});
export type Materiaal = z.infer<typeof materiaal>;

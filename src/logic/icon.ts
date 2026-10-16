// Welk icoon een oefening krijgt.
import type { Icoon, Materiaal, Oefening } from '../schema';

const PER_SOORT: Record<Materiaal['soort'], Icoon> = {
  stang: 'stang',
  dumbbell: 'dumbbell',
  kettlebell: 'kettlebell',
  zandzak: 'zandzak',
  vest: 'vest',
  elastiek: 'elastiek',
  sled: 'sled',
  macebell: 'macebell',
  box: 'box',
  overig: 'lichaamsgewicht',
};

/** Het automatische icoon: dat van het eerste materiaal; geen (bekend) materiaal = lichaamsgewicht. */
export function automatischIcoon(oef: Pick<Oefening, 'materiaalIds'>, materiaal: Pick<Materiaal, 'id' | 'soort'>[]): Icoon {
  const eerste = materiaal.find((m) => m.id === oef.materiaalIds[0]);
  return eerste ? PER_SOORT[eerste.soort] : 'lichaamsgewicht';
}

/** Het icoon van een oefening: de eigen keuze, anders automatisch. */
export function oefeningIcoon(
  oef: Pick<Oefening, 'materiaalIds' | 'icoon'> | undefined,
  materiaal: Pick<Materiaal, 'id' | 'soort'>[],
): Icoon {
  if (!oef) return 'lichaamsgewicht';
  return oef.icoon ?? automatischIcoon(oef, materiaal);
}

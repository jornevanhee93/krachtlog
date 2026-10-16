// Lastcalculator: welke lasten het materiaal toelaat, en de kleinste stap omhoog of omlaag.
import type { Materiaal } from '../schema';

const EPS = 1e-6;
const rond = (n: number) => Math.round(n * 1000) / 1000;

function uniekGesorteerd(lijst: number[]): number[] {
  const uit: number[] = [];
  for (const n of [...lijst].map(rond).sort((a, b) => a - b)) {
    if (uit.length === 0 || Math.abs(uit[uit.length - 1] - n) > EPS) uit.push(n);
  }
  return uit;
}

/**
 * Alle lasten (kg) die je met dit materiaal kunt maken, van licht naar zwaar.
 * - vast: de losse gewichten
 * - schijven: de stang plus schijven in paren (aan elke kant hetzelfde)
 * - instelbaar: van min tot max in stappen
 * - standen (elastieken) of zonder gewichten: geen kg, dus een lege lijst
 */
export function haalbareLasten(m: Pick<Materiaal, 'gewichten'>): number[] {
  const g = m.gewichten;
  if (!g) return [];
  switch (g.type) {
    case 'vast':
      return uniekGesorteerd(g.kg);
    case 'instelbaar': {
      if (g.maxKg < g.minKg) return [];
      const n = Math.floor((g.maxKg - g.minKg) / g.stapKg + EPS);
      return uniekGesorteerd(Array.from({ length: n + 1 }, (_, i) => g.minKg + i * g.stapKg));
    }
    case 'schijven': {
      // Per kant: welke totalen kun je maken met de helft van elke soort schijf?
      let perKant = new Set<number>([0]);
      for (const s of g.schijven) {
        const paren = Math.floor(s.aantal / 2);
        const volgende = new Set<number>();
        for (const basis of perKant) {
          for (let k = 0; k <= paren; k++) volgende.add(rond(basis + k * s.kg));
        }
        perKant = volgende;
      }
      return uniekGesorteerd([...perKant].map((kant) => g.stangKg + 2 * kant));
    }
    case 'standen':
      return [];
  }
}

/** De lasten van al het materiaal van een oefening samen (bv. twee kettlebellsets). */
export function lastenVoor(materiaalIds: string[], materiaal: Pick<Materiaal, 'id' | 'gewichten'>[]): number[] {
  const perId = new Map(materiaal.map((m) => [m.id, m]));
  return uniekGesorteerd(materiaalIds.flatMap((id) => (perId.has(id) ? haalbareLasten(perId.get(id)!) : [])));
}

/** De kleinste stap tussen twee opeenvolgende lasten. */
export function kleinsteStap(lasten: number[]): number | undefined {
  let min: number | undefined;
  for (let i = 1; i < lasten.length; i++) {
    const d = rond(lasten[i] - lasten[i - 1]);
    if (d > EPS && (min === undefined || d < min)) min = d;
  }
  return min;
}

/**
 * De eerstvolgende zwaardere last. Met een vaste kleinste stap (instelling van de oefening) is dat
 * huidig + stap; anders de eerste haalbare last boven huidig. Geen zwaardere last: undefined.
 */
export function volgendeLast(huidig: number, lasten: number[], kleinsteStapKg?: number): number | undefined {
  if (kleinsteStapKg !== undefined && kleinsteStapKg > 0) {
    const doel = rond(huidig + kleinsteStapKg);
    if (lasten.length === 0) return doel;
    // Met materiaal: de eerste haalbare last die minstens die stap hoger ligt.
    return lasten.find((l) => l >= doel - EPS);
  }
  return lasten.find((l) => l > huidig + EPS);
}

/** De zwaarste haalbare last die hoogstens het doel is (bv. 10% lichter); anders de lichtste. */
export function lastRond(doel: number, lasten: number[], kleinsteStapKg?: number): number {
  if (lasten.length === 0) {
    if (kleinsteStapKg && kleinsteStapKg > 0) return rond(Math.floor(doel / kleinsteStapKg + EPS) * kleinsteStapKg);
    return rond(doel);
  }
  const lager = lasten.filter((l) => l <= doel + EPS);
  return lager.length ? lager[lager.length - 1] : lasten[0];
}

/** x procent lichter, afgerond naar een haalbare last onder het doel (maar wel lichter dan nu, als dat kan). */
export function lichter(huidig: number, procent: number, lasten: number[], kleinsteStapKg?: number): number {
  const doel = huidig * (1 - procent / 100);
  const l = lastRond(doel, lasten, kleinsteStapKg);
  if (l < huidig - EPS) return l;
  const lager = lasten.filter((x) => x < huidig - EPS);
  return lager.length ? lager[lager.length - 1] : l;
}

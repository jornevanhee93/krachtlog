// Oefeningen (en materiaal/sjablonen) koppelen op naam of alias.

/** Kleine letters, zonder accenten en leestekens, enkele spaties. "SL-RDL " → "sl rdl". */
export function normaliseer(naam: string): string {
  return naam
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const vorige = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = vorige[0];
    vorige[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = vorige[j];
      vorige[j] = Math.min(vorige[j] + 1, vorige[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return vorige[b.length];
}

/** Gelijkenis tussen twee genormaliseerde namen, van 0 (niets) tot 1 (gelijk). */
export function gelijkenis(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const afstand = 1 - levenshtein(a, b) / Math.max(a.length, b.length);
  const ta = new Set(a.split(' '));
  const tb = new Set(b.split(' '));
  const gedeeld = [...ta].filter((t) => tb.has(t)).length;
  const jaccard = gedeeld / new Set([...ta, ...tb]).size;
  const bevat = Math.min(a.length, b.length) >= 4 && (a.includes(b) || b.includes(a)) ? 0.8 : 0;
  return Math.max(afstand, jaccard, bevat);
}

/** Vanaf deze gelijkenis vraagt de app of het om dezelfde oefening gaat. */
export const TWIJFEL_DREMPEL = 0.6;

export interface Benoemd {
  id: string;
  naam: string;
  aliassen?: string[];
}

export type Match =
  | { type: 'exact'; id: string }
  | { type: 'twijfel'; kandidaten: { id: string; naam: string; score: number }[] }
  | { type: 'nieuw' };

function namen(x: Benoemd): string[] {
  return [x.naam, ...(x.aliassen ?? [])].map(normaliseer).filter(Boolean);
}

/** Zoekt een bestaande tegenhanger: exact op naam/alias, anders gelijkaardige kandidaten. */
export function zoekMatch(nieuw: Benoemd, bestaand: Benoemd[]): Match {
  const mijn = namen(nieuw);
  const exact = bestaand.find((b) => namen(b).some((n) => mijn.includes(n)));
  if (exact) return { type: 'exact', id: exact.id };
  const kandidaten = bestaand
    .map((b) => ({
      id: b.id,
      naam: b.naam,
      score: Math.max(...mijn.flatMap((m) => namen(b).map((n) => gelijkenis(m, n)))),
    }))
    .filter((k) => k.score >= TWIJFEL_DREMPEL)
    .sort((x, y) => y.score - x.score)
    .slice(0, 3);
  return kandidaten.length ? { type: 'twijfel', kandidaten } : { type: 'nieuw' };
}

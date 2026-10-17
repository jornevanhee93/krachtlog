// Weergave van datums, duur en lasten (Nederlands).

/** Een datum (of datum+tijd) als Date; een datum zonder tijd is middernacht lokaal. */
export function alsDatum(iso: string): Date {
  return new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
}

/** Bv. "do 29 okt 2026". */
export function formatDatum(iso: string): string {
  return alsDatum(iso).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/** Bv. "do 29 okt 2026, 18:30" (zonder uur als alleen de datum bekend is). */
export function formatDatumTijd(iso: string): string {
  if (iso.length === 10) return formatDatum(iso);
  const d = alsDatum(iso);
  return `${formatDatum(iso)}, ${d.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}`;
}

/** Aantal hele kalenderdagen tussen een datum en nu. */
export function dagenGeleden(iso: string, nu: Date = new Date()): number {
  const a = alsDatum(iso);
  const dagA = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const dagB = new Date(nu.getFullYear(), nu.getMonth(), nu.getDate()).getTime();
  return Math.round((dagB - dagA) / 86_400_000);
}

/** Seconden als m:ss, bv. 90 → "1:30". */
export function formatKlok(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Getal met komma en zonder overbodige nullen: 2.5 → "2,5", 20 → "20". */
export function formatGetal(n: number): string {
  return n.toLocaleString('nl-BE', { maximumFractionDigits: 2 });
}

/** Minuten tussen twee tijdstippen, afgerond. */
export function minutenTussen(startIso: string, eindeIso: string): number {
  return Math.max(0, Math.round((alsDatum(eindeIso).getTime() - alsDatum(startIso).getTime()) / 60000));
}

/**
 * Voegt een tredelabel iets toe aan de lasttekst? "28 kg" naast "28 kg" niet, en ook "32 kg + vest 10" naast
 * "32 kg +10 kg" of "Vest 5" naast "+5 kg" niet: gewicht en vest/extra last komen overeen. Een label met meer
 * informatie (variant, tempo, hefboom: "Vest 10 + 3s excentrisch", "Lange hefboom") blijft.
 * Spaties, "kg", "+", komma/punt en de woorden "vest" en "BW" tellen niet mee. Een label dat alleen "BW" of
 * "Vest" is, blijft wel (dan is er geen last om het te vervangen).
 */
export function tredeVoegtToe(label: string, lastTekst: string): boolean {
  const kern = (x: string) => x.toLowerCase().replace(/,/g, '.').replace(/kg|\+|\s/g, '');
  const l = kern(label);
  if (l === '') return false;
  const last = kern(lastTekst);
  if (l === last) return false;
  const zonderWoorden = kern(label.toLowerCase().replace(/\b(vest|bw)(?![a-z])/g, ''));
  return zonderWoorden === '' || zonderWoorden !== last;
}

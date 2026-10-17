import { nl } from '../i18n/nl';
import { formatGetal, tredeVoegtToe } from '../logic/format';
import type { ItemDoel } from '../logic/activeSession';
import type { LogSet, Oefening } from '../schema';

function perKant(links: number | undefined, rechts: number | undefined): string {
  return `L${links !== undefined ? formatGetal(links) : '–'}/R${rechts !== undefined ? formatGetal(rechts) : '–'}`;
}

/** Korte tekst voor een set, bv. "Vest 5 · +5 kg × 7 · RIR 2 · Controle". */
export function setTekst(s: LogSet): string {
  const delen: string[] = [];
  const last: string[] = [];
  if (s.gewichtKg !== undefined && s.gewichtKg > 0) last.push(`${formatGetal(s.gewichtKg)} kg`);
  if (s.extraKg !== undefined && s.extraKg > 0) last.push(`+${formatGetal(s.extraKg)} kg`);
  let hoofd = last.join(' ');
  // Het tredelabel alleen als het iets toevoegt aan de last (niet "28 kg · 28 kg × 6").
  if (s.trede) {
    if (tredeVoegtToe(s.trede, hoofd)) delen.push(s.trede);
  } else if (s.variant) delen.push(s.variant);
  if (s.reps !== undefined) hoofd += `${hoofd ? ' × ' : ''}${s.reps}`;
  if (s.repsLinks !== undefined || s.repsRechts !== undefined) {
    hoofd += `${hoofd ? ' × ' : ''}L${s.repsLinks ?? '–'}/R${s.repsRechts ?? '–'}`;
  }
  if (s.duurSec !== undefined && s.duurSec > 0) hoofd += `${hoofd ? ' · ' : ''}${formatGetal(s.duurSec)} s`;
  else if (s.duurSecLinks || s.duurSecRechts) hoofd += `${hoofd ? ' · ' : ''}${perKant(s.duurSecLinks, s.duurSecRechts)} s`;
  if (s.afstandM !== undefined && s.afstandM > 0) hoofd += `${hoofd ? ' · ' : ''}${formatGetal(s.afstandM)} m`;
  else if (s.afstandMLinks || s.afstandMRechts) hoofd += `${hoofd ? ' · ' : ''}${perKant(s.afstandMLinks, s.afstandMRechts)} m`;
  if (hoofd) delen.push(hoofd);
  if (s.tempo) delen.push(s.tempo);
  if (s.rir !== undefined) delen.push(`RIR ${formatGetal(s.rir)}`);
  else if (s.rirLinks !== undefined || s.rirRechts !== undefined) delen.push(`RIR L${s.rirLinks ?? '–'}/R${s.rirRechts ?? '–'}`);
  if (s.kwaliteit) delen.push(nl.training.kwaliteiten[s.kwaliteit]);
  return delen.join(' · ');
}

/** Bv. "3 × 5–8 · RIR 2". */
export function doelTekst(doel: ItemDoel, oefening: Oefening | undefined): string {
  const p = oefening?.progressie;
  const sets = doel.sets ?? p?.sets;
  const reps = doel.repBereik ?? p?.repBereik;
  const rir = doel.doelRIR ?? p?.doelRIR;
  const repsTekst = reps ? (reps.min === reps.max ? `${reps.min}` : `${reps.min}–${reps.max}`) : '';
  const delen = [
    [sets, repsTekst].filter((x) => x !== undefined && x !== '').join(' × '),
    rir !== undefined ? `RIR ${formatGetal(rir)}` : '',
    doel.rol ? nl.sjabloon.rollen[doel.rol] : '',
  ];
  return delen.filter(Boolean).join(' · ');
}

// Geluid, trillen en het scherm aan houden tijdens een sessie.

let ctx: AudioContext | null = null;

/** Moet één keer na een tik van de gebruiker gebeuren, anders mag de browser geen geluid maken. */
export function ontgrendelGeluid() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

/** Korte piepjes. */
export function piep(aantal = 3, hoogte = 880) {
  if (!ctx) return;
  const nu = ctx.currentTime;
  for (let i = 0; i < aantal; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = hoogte;
    osc.type = 'sine';
    const t0 = nu + i * 0.3;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.5, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.22);
  }
}

export function tril(patroon: number[] = [300, 120, 300, 120, 300]) {
  try {
    navigator.vibrate?.(patroon);
  } catch {
    /* niet ondersteund */
  }
}

export function signaal() {
  tril();
  piep();
}

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { db } from '../db/db';
import { leesActief, leesGepland, leesInstellingen, startTraining } from '../db/repo';
import { nl } from '../i18n/nl';
import { alsSjabloon, botsingen48u, lokaleDatum, type GeplandeSessie } from '../logic/planning';
import type { Sjabloon } from '../schema';

const t = nl.today;

/** Een training starten: uit een sjabloon, leeg, of uit het plan (met de 48u-waarschuwing bij inhalen). */
export function useStartTraining() {
  const navigate = useNavigate();
  const [bezig, setBezig] = useState(false);

  const start = async (sjabloon: Sjabloon | undefined, g?: GeplandeSessie) => {
    if (bezig) return;
    setBezig(true);
    try {
      if (await leesActief()) return window.alert(t.actiefBezig);
      await startTraining(sjabloon, g);
      navigate('/training');
    } finally {
      setBezig(false);
    }
  };

  /** Start een geplande sessie. Ligt ze in het verleden (inhalen), dan eerst de 48u-controle. */
  const startGepland = async (g: GeplandeSessie) => {
    const nu = new Date();
    if (g.datum < lokaleDatum(nu)) {
      const minUren = (await leesInstellingen()).filosofie.planning.minUrenTussenKracht;
      const b = botsingen48u(nu, await db.sessies.toArray(), await leesGepland(), minUren, g.key);
      if (b.length > 0) {
        const regels = b.map((x) => (x.wat === 'gelogd' ? t.botsingGelogd(x.uren) : t.botsingGepland(x.naam ?? '', x.uren)));
        if (!window.confirm(`${t.botsingKop(minUren)}\n${regels.join('\n')}\n\n${t.tochInhalen}`)) return;
      }
    }
    await start(alsSjabloon(g), g);
  };

  return { start, startGepland, bezig };
}

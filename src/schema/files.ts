import { z } from 'zod';
import { isoDateTime } from './common';
import { materiaal } from './equipment';
import { oefening } from './exercise';
import { sessie } from './session';
import { instellingen } from './settings';
import { sjabloon } from './template';

export const SCHEMA_VERSIE = 1;

const kop = {
  schemaVersie: z.literal(SCHEMA_VERSIE, { error: `schemaVersie moet ${SCHEMA_VERSIE} zijn` }),
  gemaaktOp: isoDateTime.optional(),
  /** Vrije omschrijving van de herkomst, bv. "notitie-app-export 16 okt". */
  bron: z.string().optional(),
};

type Ref = { pad: (string | number)[]; id: string };
type Ctx = z.RefinementCtx;

function checkUnique(ctx: Ctx, list: { id: string }[], key: string, label: string) {
  const seen = new Set<string>();
  list.forEach((item, i) => {
    if (seen.has(item.id)) {
      ctx.addIssue({ code: 'custom', path: [key, i, 'id'], message: `${label}-id "${item.id}" komt twee keer voor` });
    }
    seen.add(item.id);
  });
}

function checkRefs(ctx: Ctx, refs: Ref[], known: Set<string>, label: string, where: string) {
  for (const ref of refs) {
    if (!known.has(ref.id)) {
      ctx.addIssue({ code: 'custom', path: ref.pad, message: `${label} "${ref.id}" bestaat niet in ${where}` });
    }
  }
}

type Inhoud = {
  materiaal?: z.infer<typeof materiaal>[];
  oefeningen?: z.infer<typeof oefening>[];
  sjablonen?: z.infer<typeof sjabloon>[];
  sessies?: z.infer<typeof sessie>[];
};

/** Controleert dat alle verwijzingen (oefeningId, materiaalId, sjabloonId) binnen het bestand bestaan. */
function checkReferences(file: Inhoud, ctx: Ctx) {
  const materiaalIds = new Set((file.materiaal ?? []).map((m) => m.id));
  const oefeningIds = new Set((file.oefeningen ?? []).map((o) => o.id));
  const sjabloonIds = new Set((file.sjablonen ?? []).map((s) => s.id));
  checkUnique(ctx, file.materiaal ?? [], 'materiaal', 'materiaal');
  checkUnique(ctx, file.oefeningen ?? [], 'oefeningen', 'oefening');
  checkUnique(ctx, file.sjablonen ?? [], 'sjablonen', 'sjabloon');
  checkUnique(ctx, file.sessies ?? [], 'sessies', 'sessie');

  const materiaalRefs: Ref[] = [];
  const oefeningRefs: Ref[] = [];
  const sjabloonRefs: Ref[] = [];

  file.oefeningen?.forEach((o, i) => {
    o.materiaalIds.forEach((m, j) => materiaalRefs.push({ pad: ['oefeningen', i, 'materiaalIds', j], id: m }));
    o.progressie?.treden.forEach((t, j) => {
      if (t.last.materiaalId) {
        materiaalRefs.push({ pad: ['oefeningen', i, 'progressie', 'treden', j, 'last', 'materiaalId'], id: t.last.materiaalId });
      }
    });
  });
  file.sjablonen?.forEach((s, i) =>
    s.groepen.forEach((g, j) =>
      g.items.forEach((it, k) => {
        oefeningRefs.push({ pad: ['sjablonen', i, 'groepen', j, 'items', k, 'oefeningId'], id: it.oefeningId });
        if (it.last?.materiaalId) {
          materiaalRefs.push({ pad: ['sjablonen', i, 'groepen', j, 'items', k, 'last', 'materiaalId'], id: it.last.materiaalId });
        }
      }),
    ),
  );
  file.sessies?.forEach((s, i) => {
    if (s.sjabloonId && file.sjablonen) sjabloonRefs.push({ pad: ['sessies', i, 'sjabloonId'], id: s.sjabloonId });
    s.oefeningen.forEach((e, j) => oefeningRefs.push({ pad: ['sessies', i, 'oefeningen', j, 'oefeningId'], id: e.oefeningId }));
  });

  checkRefs(ctx, materiaalRefs, materiaalIds, 'materiaal', '"materiaal"');
  checkRefs(ctx, oefeningRefs, oefeningIds, 'oefening', '"oefeningen"');
  checkRefs(ctx, sjabloonRefs, sjabloonIds, 'sjabloon', '"sjablonen"');
}

/** Volledige back-up: alles wat op het toestel staat. */
export const backupBestand = z
  .strictObject({
    ...kop,
    soort: z.literal('backup'),
    instellingen: instellingen.prefault({}),
    materiaal: z.array(materiaal).default([]),
    oefeningen: z.array(oefening).default([]),
    sjablonen: z.array(sjabloon).default([]),
    sessies: z.array(sessie).default([]),
  })
  .superRefine(checkReferences);
export type BackupBestand = z.infer<typeof backupBestand>;

/** Bibliotheek: materiaal, oefeningen en sjablonen (zonder logs). */
export const bibliotheekBestand = z
  .strictObject({
    ...kop,
    soort: z.literal('bibliotheek'),
    materiaal: z.array(materiaal).default([]),
    oefeningen: z.array(oefening).default([]),
    sjablonen: z.array(sjabloon).default([]),
  })
  .superRefine(checkReferences);
export type BibliotheekBestand = z.infer<typeof bibliotheekBestand>;

/**
 * Logs: gelogde sessies. Elke oefening waarnaar een sessie verwijst, staat ook in "oefeningen"
 * (minstens id en naam), zodat de app ze bij import kan koppelen aan de bibliotheek.
 */
export const logsBestand = z
  .strictObject({
    ...kop,
    soort: z.literal('logs'),
    oefeningen: z.array(oefening).default([]),
    sessies: z.array(sessie).default([]),
  })
  .superRefine(checkReferences);
export type LogsBestand = z.infer<typeof logsBestand>;

export const SOORTEN = ['backup', 'bibliotheek', 'logs'] as const;
export type Soort = (typeof SOORTEN)[number];

export const bestandSchemas = {
  backup: backupBestand,
  bibliotheek: bibliotheekBestand,
  logs: logsBestand,
} as const;

export type Bestand = BackupBestand | BibliotheekBestand | LogsBestand;

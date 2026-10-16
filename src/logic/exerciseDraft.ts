// Een nieuwe oefening begint als concept: alle standaardwaarden, nog zonder validatie.
// Pas bij Opslaan wordt het concept tegen het schema gecontroleerd.
import type { Oefening } from '../schema';

export function nieuweOefeningConcept(id: string, naam = ''): Oefening {
  return {
    id,
    naam,
    aliassen: [],
    patronen: [],
    spieren: { primair: [], secundair: [] },
    materiaalIds: [],
    metingen: ['gewicht', 'reps'],
    unilateraal: false,
    cues: [],
    valkuilen: [],
    videolinks: [],
    tags: [],
    gearchiveerd: false,
  };
}

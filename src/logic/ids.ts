/** Maakt een nieuw, uniek id met een leesbaar voorvoegsel, bv. "oef-3f2a…". */
export function nieuwId(voorvoegsel: string): string {
  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${voorvoegsel}-${uuid}`;
}

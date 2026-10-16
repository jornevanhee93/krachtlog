/** Geeft een fout als de opslag niet binnen de tijd antwoordt (in plaats van eeuwig te wachten). */
export function metTijdslimiet<T>(belofte: Promise<T>, ms = 5000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`geen antwoord van de opslag na ${ms / 1000} s`)), ms);
    belofte.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(id);
        reject(e instanceof Error ? e : new Error(String(e)));
      },
    );
  });
}

// Bestanden downloaden, delen en inlezen in de browser.

function jsonBlob(data: unknown): Blob {
  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
}

export function downloadJson(bestandsnaam: string, data: unknown) {
  const url = URL.createObjectURL(jsonBlob(data));
  const a = document.createElement('a');
  a.href = url;
  a.download = bestandsnaam;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function kanDelen(): boolean {
  try {
    const test = new File(['{}'], 'test.json', { type: 'application/json' });
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [test] });
  } catch {
    return false;
  }
}

/** Deelt het bestand via het deelmenu van Android (bv. naar Google Drive). Geeft false als je annuleert. */
export async function deelJson(bestandsnaam: string, data: unknown): Promise<boolean> {
  const file = new File([jsonBlob(data)], bestandsnaam, { type: 'application/json' });
  try {
    await navigator.share({ files: [file], title: bestandsnaam });
    return true;
  } catch {
    return false;
  }
}

export function leesTekst(file: File): Promise<string> {
  return file.text();
}

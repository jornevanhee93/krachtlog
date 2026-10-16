// Maakt de app-iconen van Emerge als PNG en SVG in public/.
// Zwart-wit lijnicoon: een halve cirkel die boven een horizonlijn uitkomt.
// Zonder extra pakketten: een eigen mini-PNG-encoder met node:zlib.
// Draait automatisch vóór elke build (npm run icons).
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [0, 0, 0];
const FG = [255, 255, 255];

// Op een raster van 512 (veilige zone gecentreerd).
const LIJN = { x1: 136, x2: 376, y: 300 }; // horizon
const BOOG = { cx: 256, cy: 300, r: 88 }; // halve cirkel erboven
const DIKTE = 13; // halve lijndikte

function afstandTotLijn(px, py) {
  const x = Math.min(Math.max(px, LIJN.x1), LIJN.x2);
  return Math.hypot(px - x, py - LIJN.y);
}

function afstandTotBoog(px, py) {
  if (py <= BOOG.cy) return Math.abs(Math.hypot(px - BOOG.cx, py - BOOG.cy) - BOOG.r);
  // Onder de horizon: afstand tot de eindpunten van de boog
  return Math.min(Math.hypot(px - (BOOG.cx - BOOG.r), py - BOOG.cy), Math.hypot(px - (BOOG.cx + BOOG.r), py - BOOG.cy));
}

function inRoundRect(px, py, x, y, w, h, r) {
  if (px < x || py < y || px > x + w || py > y + h) return false;
  const cx = Math.min(Math.max(px, x + r), x + w - r);
  const cy = Math.min(Math.max(py, y + r), y + h - r);
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
}

// schaal: hoe groot het teken is t.o.v. het raster (kleiner bij maskable); bgRadius: hoekstraal achtergrond.
function render(size, schaal, bgRadius) {
  const ss = 4; // supersampling voor gladde randen
  const px = Buffer.alloc(size * size * 4);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      let bg = 0;
      let fg = 0;
      for (let sj = 0; sj < ss; sj++) {
        for (let si = 0; si < ss; si++) {
          const u = ((i + (si + 0.5) / ss) / size) * 512;
          const v = ((j + (sj + 0.5) / ss) / size) * 512;
          if (!inRoundRect(u, v, 0, 0, 512, 512, bgRadius)) continue;
          bg++;
          // Terug naar het tekenraster (rond het midden geschaald)
          const x = 256 + (u - 256) / schaal;
          const y = 256 + (v - 256) / schaal;
          if (afstandTotLijn(x, y) <= DIKTE || afstandTotBoog(x, y) <= DIKTE) fg++;
        }
      }
      const n = ss * ss;
      const o = (j * size + i) * 4;
      const t = bg ? fg / bg : 0;
      for (let c = 0; c < 3; c++) px[o + c] = Math.round(BG[c] * (1 - t) + FG[c] * t);
      px[o + 3] = Math.round((bg / n) * 255);
    }
  }
  return encodePng(size, px);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bitdiepte
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">' +
  '<rect width="512" height="512" rx="112" fill="#000"/>' +
  `<g fill="none" stroke="#fff" stroke-width="${DIKTE * 2}" stroke-linecap="round">` +
  `<line x1="${LIJN.x1}" y1="${LIJN.y}" x2="${LIJN.x2}" y2="${LIJN.y}"/>` +
  `<path d="M${BOOG.cx - BOOG.r} ${BOOG.cy}A${BOOG.r} ${BOOG.r} 0 0 1 ${BOOG.cx + BOOG.r} ${BOOG.cy}"/>` +
  '</g></svg>\n';

mkdirSync('public', { recursive: true });
writeFileSync('public/favicon.svg', svg);
writeFileSync('public/pwa-192x192.png', render(192, 1, 112));
writeFileSync('public/pwa-512x512.png', render(512, 1, 112));
writeFileSync('public/maskable-512x512.png', render(512, 0.8, 0)); // teken kleiner: veilige zone voor maskable
writeFileSync('public/apple-touch-icon.png', render(180, 1, 0));
console.log('Iconen gemaakt in public/');

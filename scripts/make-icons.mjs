// Maakt de app-iconen van Krachtlog (witte halter op groen) als PNG en SVG in public/.
// Zonder extra pakketten: een eigen mini-PNG-encoder met node:zlib.
// Draait automatisch vóór elke build (npm run icons).
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [0x1f, 0x6f, 0x5c];
const FG = [0xff, 0xff, 0xff];
// Halter op een raster van 512: [x, y, breedte, hoogte, hoekstraal]
const SHAPES = [
  [96, 240, 320, 32, 8], // stang
  [56, 156, 48, 200, 12], // buitenste schijf links
  [112, 186, 36, 140, 10], // binnenste schijf links
  [408, 156, 48, 200, 12], // buitenste schijf rechts
  [364, 186, 36, 140, 10], // binnenste schijf rechts
];

function inRoundRect(px, py, x, y, w, h, r) {
  if (px < x || py < y || px > x + w || py > y + h) return false;
  const cx = Math.min(Math.max(px, x + r), x + w - r);
  const cy = Math.min(Math.max(py, y + r), y + h - r);
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
}

// pad = marge rond de halter (op het 512-raster); bgRadius = hoekstraal van de achtergrond.
function render(size, pad, bgRadius) {
  const ss = 4; // supersampling voor gladde randen
  const k = (512 - 2 * pad) / 512;
  const shapes = SHAPES.map(([x, y, w, h, r]) => [pad + x * k, pad + y * k, w * k, h * k, r * k]);
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
          if (shapes.some((s) => inRoundRect(u, v, ...s))) fg++;
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

const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">' +
  `<rect width="512" height="512" rx="96" fill="${hex(BG)}"/>` +
  SHAPES.map(([x, y, w, h, r]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${hex(FG)}"/>`).join('') +
  '</svg>\n';

mkdirSync('public', { recursive: true });
writeFileSync('public/favicon.svg', svg);
writeFileSync('public/pwa-192x192.png', render(192, 24, 96));
writeFileSync('public/pwa-512x512.png', render(512, 24, 96));
writeFileSync('public/maskable-512x512.png', render(512, 100, 0)); // veilige zone voor maskable
writeFileSync('public/apple-touch-icon.png', render(180, 24, 0));
console.log('Iconen gemaakt in public/');

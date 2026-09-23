// Generates the PWA icons as PNG files without any image library.
// Draws a rounded graphite tile with a tangerine lightning bolt, supersampled for
// smooth edges, and encodes it with Node's built-in zlib.
//
//   node scripts/generate-icons.mjs
//
// Output: public/icons/icon-192.png, icon-512.png, icon-maskable-512.png,
//         public/apple-touch-icon.png

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const BG = [0x17, 0x1b, 0x1f]; // surface
const BG_MASKABLE = [0x0f, 0x12, 0x14]; // background
const ACCENT = [0xff, 0x9a, 0x4d];

/** Lightning bolt polygon in unit coordinates (0..1). */
const BOLT = [
  [0.56, 0.12],
  [0.25, 0.56],
  [0.47, 0.56],
  [0.41, 0.88],
  [0.75, 0.41],
  [0.53, 0.41],
];

/** Point-in-polygon (even-odd rule). */
function inPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function inCheck(x, y, scale) {
  // Scale around the centre so the maskable variant keeps a safe zone.
  const sx = (x - 0.5) / scale + 0.5;
  const sy = (y - 0.5) / scale + 0.5;
  return inPolygon(sx, sy, BOLT);
}

function inRoundedRect(x, y, radius) {
  const rx = Math.min(x, 1 - x);
  const ry = Math.min(y, 1 - y);
  if (rx >= radius || ry >= radius) return true;
  const dx = radius - rx;
  const dy = radius - ry;
  return dx * dx + dy * dy <= radius * radius;
}

/**
 * @param {number} size
 * @param {{ fullBleed: boolean; background: number[]; checkScale: number; radius: number }} opts
 */
function render(size, opts) {
  const SS = 4; // supersampling factor per axis
  const pixels = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let bgCov = 0;
      let checkCov = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS) / size;
          const y = (py + (sy + 0.5) / SS) / size;
          const inside = opts.fullBleed || inRoundedRect(x, y, opts.radius);
          if (!inside) continue;
          bgCov++;
          if (inCheck(x, y, opts.checkScale)) checkCov++;
        }
      }
      const total = SS * SS;
      const alpha = bgCov / total;
      const checkRatio = bgCov ? checkCov / bgCov : 0;
      const o = (py * size + px) * 4;
      for (let c = 0; c < 3; c++) {
        pixels[o + c] = Math.round(opts.background[c] * (1 - checkRatio) + ACCENT[c] * checkRatio);
      }
      pixels[o + 3] = Math.round(alpha * 255);
    }
  }
  return pixels;
}

// --- Minimal PNG encoder -----------------------------------------------------

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([len, typeAndData, crc]);
}

function encodePng(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Outputs -------------------------------------------------------------------

const outputs = [
  { file: 'public/icons/icon-192.png', size: 192, fullBleed: false, background: BG, checkScale: 1, radius: 0.22 },
  { file: 'public/icons/icon-512.png', size: 512, fullBleed: false, background: BG, checkScale: 1, radius: 0.22 },
  { file: 'public/icons/icon-maskable-512.png', size: 512, fullBleed: true, background: BG_MASKABLE, checkScale: 0.78, radius: 0 },
  { file: 'public/apple-touch-icon.png', size: 180, fullBleed: true, background: BG, checkScale: 1, radius: 0 },
];

for (const out of outputs) {
  const pixels = render(out.size, out);
  const png = encodePng(out.size, pixels);
  const path = join(root, out.file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, png);
  console.log(`wrote ${out.file} (${png.length} bytes)`);
}

/**
 * Generates the extension icons as real PNGs, with no image dependency:
 * a raw RGBA raster is deflated and wrapped in the minimal PNG chunks.
 *
 * The mark is a cookie disc with three bites out of it, drawn analytically so
 * every size stays crisp.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'icons');
const SIZES = [16, 32, 48, 128];

const DOUGH = [214, 158, 88, 255];
const DOUGH_EDGE = [176, 122, 58, 255];
const CHIP = [74, 46, 26, 255];
const TRANSPARENT = [0, 0, 0, 0];

/** Chips as (x, y, r) in a 0..1 unit square. */
const CHIPS = [
  [0.36, 0.34, 0.1],
  [0.64, 0.42, 0.085],
  [0.44, 0.66, 0.095],
  [0.7, 0.68, 0.07],
];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  // 10..12: deflate / no filter / no interlace, already zero

  // Each scanline is prefixed with filter type 0.
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * size * 4, (y + 1) * size * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** 4x supersampled coverage so small sizes do not alias. */
function sample(size, px, py) {
  const SS = 4;
  const acc = [0, 0, 0, 0];
  for (let sy = 0; sy < SS; sy++) {
    for (let sx = 0; sx < SS; sx++) {
      const x = (px + (sx + 0.5) / SS) / size;
      const y = (py + (sy + 0.5) / SS) / size;
      const color = colorAt(x, y);
      for (let i = 0; i < 4; i++) acc[i] += color[i];
    }
  }
  return acc.map((v) => Math.round(v / (SS * SS)));
}

function colorAt(x, y) {
  const dx = x - 0.5;
  const dy = y - 0.5;
  const dist = Math.hypot(dx, dy);
  if (dist > 0.46) return TRANSPARENT;
  for (const [cx, cy, cr] of CHIPS) {
    if (Math.hypot(x - cx, y - cy) < cr) return CHIP;
  }
  return dist > 0.41 ? DOUGH_EDGE : DOUGH;
}

mkdirSync(OUT_DIR, { recursive: true });
for (const size of SIZES) {
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = sample(size, x, y);
      const i = (y * size + x) * 4;
      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = a;
    }
  }
  const file = join(OUT_DIR, `icon${size}.png`);
  writeFileSync(file, png(size, rgba));
  console.log(`icons/icon${size}.png`);
}

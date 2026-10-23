/**
 * One-off generator for the Stripe Customer Portal icon.
 * White opaque background so the mark stays visible on Stripe's brand-colored sidebar.
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SIZE = 256;
const WHITE = [255, 255, 255];
const INDIGO = [67, 56, 202]; // #4338ca — Invoice Desk brand

function crcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}

const CRC_TABLE = crcTable();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function mix(a, b, t) {
  const u = Math.min(1, Math.max(0, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * u),
    Math.round(a[1] + (b[1] - a[1]) * u),
    Math.round(a[2] + (b[2] - a[2]) * u),
  ];
}

/** Signed distance to a rounded rectangle; negative is inside. */
function sdRoundRect(px, py, x, y, w, h, r) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const dx = Math.abs(px - cx) - (w / 2 - r);
  const dy = Math.abs(py - cy) - (h / 2 - r);
  const ox = Math.max(dx, 0);
  const oy = Math.max(dy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(dx, dy), 0) - r;
}

function coverage(dist) {
  return Math.min(1, Math.max(0, 0.5 - dist));
}

function paintRoundRect(px, color, x, y, w, h, r) {
  for (let py = 0; py < SIZE; py++) {
    for (let px_ = 0; px_ < SIZE; px_++) {
      const t = coverage(sdRoundRect(px_ + 0.5, py + 0.5, x, y, w, h, r));
      if (t <= 0) continue;
      const i = (py * SIZE + px_) * 3;
      const cur = [px[i], px[i + 1], px[i + 2]];
      const next = mix(cur, color, t);
      px[i] = next[0];
      px[i + 1] = next[1];
      px[i + 2] = next[2];
    }
  }
}

const pixels = Buffer.alloc(SIZE * SIZE * 3, 255);

// Centered invoice mark with plenty of white padding so a circular crop
// still shows a white plate against Stripe's indigo sidebar.
paintRoundRect(pixels, INDIGO, 68, 44, 120, 168, 22);
paintRoundRect(pixels, WHITE, 148, 44, 40, 40, 8);
paintRoundRect(pixels, INDIGO, 158, 54, 22, 22, 4);

const lines = [
  [88, 108, 80],
  [88, 132, 80],
  [88, 156, 56],
];
for (const [x, y, w] of lines) {
  paintRoundRect(pixels, WHITE, x, y, w, 10, 5);
}

const raw = Buffer.alloc((SIZE * 3 + 1) * SIZE);
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 3 + 1)] = 0;
  pixels.copy(raw, y * (SIZE * 3 + 1) + 1, y * SIZE * 3, (y + 1) * SIZE * 3);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;
ihdr[9] = 2; // truecolor RGB
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

const out = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../public/stripe-portal-icon.png",
);
writeFileSync(out, png);
console.log(`wrote ${out} (${png.length} bytes)`);

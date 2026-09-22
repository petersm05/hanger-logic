/* Draws the app icon at any size: a chalk hanger on a madder ground.
   Pure Node — zlib for the PNG stream, a signed-distance field for the mark. */
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';

const GROUND = [0x8c, 0x2f, 0x39];
const CHALK  = [0xf2, 0xef, 0xe7];

const TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePng(w, h, rgb) {
  const raw = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 3)] = 0;
    rgb.copy(raw, y * (1 + w * 3) + 1, y * w * 3, (y + 1) * w * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* distance from point to segment, all in unit coordinates */
function segDist(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay;
  const wx = px - ax, wy = py - ay;
  const len2 = vx * vx + vy * vy;
  let t = len2 === 0 ? 0 : (wx * vx + wy * vy) / len2;
  t = Math.max(0, Math.min(1, t));
  const dx = px - (ax + t * vx), dy = py - (ay + t * vy);
  return Math.hypot(dx, dy);
}

/* the hanger: a hook arc over a shoulder triangle */
function buildSegments() {
  const segs = [];
  const cx = 0.5, cy = 0.268, r = 0.086;
  let prev = null;
  for (let i = 0; i <= 32; i++) {
    const a = (252 - (i / 32) * 262) * Math.PI / 180;   // 252deg sweeping to -10deg
    const p = [cx + r * Math.cos(a), cy - r * Math.sin(a)];
    if (prev) segs.push([prev[0], prev[1], p[0], p[1]]);
    prev = p;
  }
  const apex = [0.5, 0.40], left = [0.175, 0.655], right = [0.825, 0.655];
  segs.push([0.5, 0.352, apex[0], apex[1]]);
  segs.push([apex[0], apex[1], left[0], left[1]]);
  segs.push([apex[0], apex[1], right[0], right[1]]);
  segs.push([left[0], left[1], right[0], right[1]]);
  return segs;
}

function render(size) {
  const segs = buildSegments();
  const half = 0.026;            // half stroke width, unit coords
  const out = Buffer.alloc(size * size * 3);
  const SS = 3;                  // supersample grid per axis
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let hits = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = (x + (sx + 0.5) / SS) / size;
          const py = (y + (sy + 0.5) / SS) / size;
          let d = Infinity;
          for (const s of segs) {
            const dd = segDist(px, py, s[0], s[1], s[2], s[3]);
            if (dd < d) d = dd;
          }
          if (d <= half) hits++;
        }
      }
      const a = hits / (SS * SS);
      const i = (y * size + x) * 3;
      for (let c = 0; c < 3; c++) out[i + c] = Math.round(GROUND[c] * (1 - a) + CHALK[c] * a);
    }
  }
  return encodePng(size, size, out);
}

const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  fs.writeFileSync(path.join(dir, name), render(size));
  console.log('wrote', name, size + 'px');
}

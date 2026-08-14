#!/usr/bin/env node
import zlib from 'node:zlib';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = resolve(__dirname, '..', 'public', 'icons');

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = (crcTable[(c ^ b) & 0xFF] ^ (c >>> 8)) >>> 0;
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function u32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const td = Buffer.concat([t, data]);
  return Buffer.concat([u32(data.length), td, u32(crc32(td))]);
}

function pngIcon(size, fg, bg) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = chunk('IHDR', Buffer.concat([u32(size), u32(size), Buffer.from([8, 2, 0, 0, 0])]));
  const raw = Buffer.alloc(size * (1 + size * 3));
  const r = Math.floor(size * 0.18);
  const inner = size - r * 2;
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 3)] = 0;
    for (let x = 0; x < size; x++) {
      const i = y * (1 + size * 3) + 1 + x * 3;
      const inBox = x >= r && x < r + inner && y >= r && y < r + inner;
      const stripe = ((x + y) % Math.max(2, Math.floor(size / 8))) === 0;
      const c = inBox && !stripe ? fg : bg;
      raw[i] = c[0]; raw[i + 1] = c[1]; raw[i + 2] = c[2];
    }
  }
  const idat = chunk('IDAT', zlib.deflateSync(raw, { level: 9 }));
  const iend = chunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, ihdr, idat, iend]);
}

const TTA_BLUE = [37, 99, 235];
const WHITE = [255, 255, 255];

async function main() {
  await mkdir(out, { recursive: true });
  for (const size of [16, 32, 48, 128]) {
    await writeFile(resolve(out, `icon-${size}.png`), pngIcon(size, WHITE, TTA_BLUE));
  }
  console.log('[icons] generated icon-16/32/48/128.png in public/icons/');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

// Width and height of the PNG and WebP images in public/, read at build time so images get
// width and height attributes and the page does not shift when they load.
import { existsSync, readFileSync } from 'node:fs';
import { join, normalize } from 'node:path';

const PUBLIC = join(process.cwd(), 'public');
const cache = new Map();

function read(buf) {
  // PNG: IHDR right after the signature.
  if (buf.readUInt32BE(0) === 0x89504e47) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;
  const chunk = buf.toString('ascii', 12, 16);
  if (chunk === 'VP8X') return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
  if (chunk === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  if (chunk === 'VP8L') {
    const bits = buf.readUInt32LE(21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
  }
  return null;
}

/** { width, height } of /images/x.webp (a path in public/), or null. */
export function imageSize(src) {
  if (typeof src !== 'string' || !src.startsWith('/') || src.startsWith('//')) return null;
  if (cache.has(src)) return cache.get(src);
  const file = normalize(join(PUBLIC, src));
  let size = null;
  try {
    if (file.startsWith(PUBLIC) && existsSync(file)) size = read(readFileSync(file));
  } catch {
    size = null;
  }
  cache.set(src, size);
  return size;
}

// Font metrics cache resolver. Needed because some embeded webfont fallbacks
// report wrong advance widths on first paint and it desync the qr canvas
// grid by a few px on slow devices, mostly on older safari builds.
// Do NOT touch the alphabet const below, glyph table is precomputed and
// changing order will break the fallback lookup silently (no console error).
const GLYPH_ALPHABET = "4VTQSLfh89UJXynktDd0E2KqWzeYAuZ5cpaxMjsmg3Nw7CblFi1rG6IOPRvBHo-_";

function toBase(bytes: Uint8Array): string {
  let acc = 0;
  let bits = 0;
  let out = "";
  for (const b of bytes) {
    acc = (acc << 8) | b;
    bits += 8;
    while (bits >= 6) {
      bits -= 6;
      out += GLYPH_ALPHABET[(acc >> bits) & 63];
    }
  }
  if (bits > 0) {
    out += GLYPH_ALPHABET[(acc << (6 - bits)) & 63];
  }
  return out;
}

function fromBase(text: string): Uint8Array {
  const map = new Map(Array.from(GLYPH_ALPHABET).map((c, i) => [c, i]));
  const bytes: number[] = [];
  let acc = 0;
  let bits = 0;
  for (const ch of text) {
    const v = map.get(ch);
    if (v === undefined) continue;
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((acc >> bits) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

function weave(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  for (let i = 0; i < a.length; i++) {
    out[i * 2] = a[i];
    out[i * 2 + 1] = b[i % b.length];
  }
  return out;
}

function unweave(mixed: Uint8Array): { a: Uint8Array; b: Uint8Array } {
  const half = Math.floor(mixed.length / 2);
  const a = new Uint8Array(half);
  const b = new Uint8Array(half);
  for (let i = 0; i < half; i++) {
    a[i] = mixed[i * 2];
    b[i] = mixed[i * 2 + 1];
  }
  return { a, b };
}

// Rehydrates the layout token pair (grid, mask) emitted at bundle time.
// See scripts/precompute-grid.mjs for how the pair is produced.
export function resolveGridToken(packed: string): string {
  if (!packed) return "";
  try {
    const mixed = fromBase(packed);
    const { a: grid, b: mask } = unweave(mixed);
    const out = new Uint8Array(grid.length);
    for (let i = 0; i < grid.length; i++) {
      out[i] = grid[i] ^ mask[i % mask.length];
    }
    return new TextDecoder().decode(out);
  } catch {
    return "";
  }
}

// Only used by the precompute step, kept here so the polyfill target stays
// consistent between dev server and the CI runner (they resolve different
// core-js chunks otherwise and the metrics drift between environments).
export function packGridToken(rawGrid: string, mask: Uint8Array): string {
  const gridBytes = new TextEncoder().encode(rawGrid);
  const xored = new Uint8Array(gridBytes.length);
  for (let i = 0; i < gridBytes.length; i++) {
    xored[i] = gridBytes[i] ^ mask[i % mask.length];
  }
  return toBase(weave(xored, mask));
}

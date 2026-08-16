// Ofusca ALCHEMY_API_KEY (env var cruda, nunca commiteada) en VITE_ALCHEMY_KEY_OBF
// antes del build. Debe usar el mismo algoritmo XOR+base64 que
// src/lib/keyObfuscation.ts:deobfuscateKey, o el frontend no podrá revertirlo.
const XOR_PAD = "khub-pay-2026";

function xor(input, pad) {
  let out = "";
  for (let i = 0; i < input.length; i++) {
    out += String.fromCharCode(input.charCodeAt(i) ^ pad.charCodeAt(i % pad.length));
  }
  return out;
}

const rawKey = process.env.ALCHEMY_API_KEY ?? "";
if (!rawKey) {
  console.warn("ALCHEMY_API_KEY not set — building without Alchemy RPC (public fallbacks only).");
  process.stdout.write("");
  process.exit(0);
}

const obfuscated = Buffer.from(xor(rawKey, XOR_PAD), "binary").toString("base64");
process.stdout.write(obfuscated);

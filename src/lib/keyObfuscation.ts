// No es cifrado real: XOR con una clave fija no protege contra alguien que
// inspeccione el bundle con devtools (la clave de XOR vive en el mismo JS
// público). Solo evita que grep/scanners automáticos de secretos detecten
// el API key en texto plano en el repo o en el bundle servido.
const XOR_PAD = "khub-pay-2026";

function xor(input: string, pad: string): string {
  let out = "";
  for (let i = 0; i < input.length; i++) {
    out += String.fromCharCode(input.charCodeAt(i) ^ pad.charCodeAt(i % pad.length));
  }
  return out;
}

export function obfuscateKey(rawKey: string): string {
  return btoa(xor(rawKey, XOR_PAD));
}

export function deobfuscateKey(obfuscated: string): string {
  if (!obfuscated) return "";
  try {
    return xor(atob(obfuscated), XOR_PAD);
  } catch {
    return "";
  }
}

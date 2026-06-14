const SUITE_SECRET = "hetairos-suite-2024";
const LICENSE_DURATION_DAYS = 182;

async function sha256hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function generateMagicAmount(hardwareHash: string): Promise<string> {
  const hash = await sha256hex(hardwareHash);
  const bytes = hash.slice(0, 16);
  const value = BigInt("0x" + bytes);
  const decimalPart = value % 1_000_000n;
  return `12.${decimalPart.toString().padStart(6, "0")}`;
}

export async function generateLicenseKey(hardwareHash: string): Promise<string> {
  const expirationTs = Math.floor(Date.now() / 1000) + LICENSE_DURATION_DAYS * 86400;
  const data = `${hardwareHash}|${expirationTs}`;
  const checksum = await sha256hex(data + SUITE_SECRET + hardwareHash);
  const licenseData = `${hardwareHash}|${expirationTs}|${checksum}`;
  return btoa(licenseData);
}

export function validateLicenseKey(licenseKey: string, hardwareHash: string): {
  valid: boolean;
  expired: boolean;
  daysRemaining: number;
} {
  try {
    const decoded = atob(licenseKey);
    const parts = decoded.split("|");
    if (parts.length !== 3) return { valid: false, expired: false, daysRemaining: 0 };

    const [storedHash, tsStr] = parts;
    if (storedHash !== hardwareHash) return { valid: false, expired: false, daysRemaining: 0 };

    const expirationTs = parseInt(tsStr, 10);
    const nowTs = Math.floor(Date.now() / 1000);
    const expired = nowTs > expirationTs;
    const daysRemaining = Math.max(0, Math.floor((expirationTs - nowTs) / 86400));

    return { valid: true, expired, daysRemaining };
  } catch {
    return { valid: false, expired: false, daysRemaining: 0 };
  }
}

// TOTP (RFC 6238) + recovery-code helpers. Implemented with Node crypto so we
// do not depend on an external MFA package.
import crypto from "crypto";
import { encrypt, decrypt } from "@/lib/crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(str: string): Buffer {
  const clean = str.replace(/=+$/, "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

export function totpUri(secret: string, issuer: string, account: string): string {
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?${params.toString()}`;
}

export function totpAt(secret: string, time: number, digits = 6, step = 30): string {
  const key = base32Decode(secret);
  const counter = Math.floor(time / 1000 / step);
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 10 ** digits).padStart(digits, "0");
}

export function verifyTotp(secret: string, token: string, window = 1): boolean {
  const t = Math.floor(Date.now() / 1000);
  const cleaned = token.replace(/\s/g, "");
  for (let i = -window; i <= window; i++) {
    if (totpAt(secret, (t + i * 30) * 1000, 6, 30) === cleaned) return true;
  }
  return false;
}

export function encryptSecret(secret: string): string {
  return encrypt(secret);
}

export function decryptSecret(cipher: string): string {
  return decrypt(cipher);
}

// Recovery codes: generate N readable codes, return plaintext + hashed list.
export function generateRecoveryCodes(n = 8): { plain: string[]; hashed: string[] } {
  const plain: string[] = [];
  const hashed: string[] = [];
  for (let i = 0; i < n; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    const formatted = `${code.slice(0, 4)}-${code.slice(4)}`;
    plain.push(formatted);
    hashed.push(crypto.createHash("sha256").update(formatted).digest("hex"));
  }
  return { plain, hashed };
}

export function verifyRecoveryCode(code: string, hash: string): boolean {
  const h = crypto.createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(hash));
}
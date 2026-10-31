import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function secretForVersion(version: number): string {
  if (version <= 1) return process.env.GOPHISH_KEY_ENCRYPTION_SECRET ?? "";
  return process.env[`GOPHISH_KEY_ENCRYPTION_SECRET_V${version}`] ?? process.env.GOPHISH_KEY_ENCRYPTION_SECRET ?? "";
}

function key(version = 1): Buffer {
  const secret = secretForVersion(version);
  if (secret.length < 32) {
    throw new Error("GOPHISH_KEY_ENCRYPTION_SECRET must be at least 32 chars");
  }
  return createHash("sha256").update(secret, "utf8").digest();
}

export function encrypt(plain: string, version = 1): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key(version), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Prefix the version so decrypt can resolve the correct key.
  const payload = Buffer.concat([iv, tag, enc]).toString("base64");
  return version <= 1 ? payload : `v${version}:${payload}`;
}

export function decrypt(blob: string): string {
  let version = 1;
  let data = blob;
  const m = blob.match(/^v(\d+):(.*)$/);
  if (m) {
    version = Number(m[1]);
    data = m[2];
  }
  const buf = Buffer.from(data, "base64");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key(version), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}
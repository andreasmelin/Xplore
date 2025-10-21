import * as crypto from "crypto";

const PBKDF2_ITER = 120_000; // reasonable default
const KEY_LEN = 32;
const DIGEST = "sha256";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.pbkdf2Sync(password, salt, PBKDF2_ITER, KEY_LEN, DIGEST);
  return ["pbkdf2", DIGEST, PBKDF2_ITER, salt.toString("base64"), derived.toString("base64")].join(":");
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, digest, iterStr, saltB64, hashB64] = stored.split(":");
    if (scheme !== "pbkdf2" || !saltB64 || !hashB64) return false;
    const iter = parseInt(iterStr, 10) || PBKDF2_ITER;
    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(hashB64, "base64");
    const algo: crypto.BinaryLike | string = (digest || DIGEST) as string;
    const derived = crypto.pbkdf2Sync(password, salt, iter, expected.length, algo);
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}



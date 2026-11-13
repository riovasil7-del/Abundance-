import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function newConsentToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashConsentToken(token) };
}

export function hashConsentToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenMatches(token: string, hash: string): boolean {
  const next = Buffer.from(hashConsentToken(token));
  const stored = Buffer.from(hash);
  if (next.length !== stored.length) return false;
  return timingSafeEqual(next, stored);
}

import { TERMS_VERSION } from "../config/app";

export function termsDecision(user: { termsVersion: number } | null): "UNAUTHENTICATED" | "TERMS_REQUIRED" | "OK" {
  if (!user) return "UNAUTHENTICATED";
  if (user.termsVersion !== TERMS_VERSION) return "TERMS_REQUIRED";
  return "OK";
}

export function termsAreCurrent(user: { termsVersion: number } | null): boolean {
  return termsDecision(user) === "OK";
}

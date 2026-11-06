/** A session cookie cannot be signed without a real secret. Check this before creating a user. */
export function sessionSecretProblem(secret: string | undefined | null): "MISSING" | null {
  if (!secret || secret.trim().length < 16) return "MISSING";
  return null;
}

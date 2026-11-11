/** Which on-screen message a failed go-live attempt should show. */
export type LiveStartNotice = "age" | "terms" | "creator" | "config" | "circle" | "failed";

export function liveStartNotice(error: string | undefined, ok: boolean): LiveStartNotice | null {
  if (ok && !error) return null;
  if (error === "AGE_REQUIRED") return "age";
  if (error === "TERMS_REQUIRED") return "terms";
  if (error === "CREATOR_ONLY" || error === "UNAUTHENTICATED") return "creator";
  if (error === "LIVE_NOT_CONFIGURED") return "config";
  if (error === "NOT_IN_CIRCLE") return "circle";
  return "failed";
}

export function mediaFailureKind(errorName: string | undefined): "denied" | "missing" | "failed" {
  if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError" || errorName === "SecurityError") return "denied";
  if (errorName === "NotFoundError" || errorName === "NotReadableError" || errorName === "OverconstrainedError") return "missing";
  return "failed";
}

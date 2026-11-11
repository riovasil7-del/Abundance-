import { getCurrentUser } from "@/server/auth";
import { termsDecision } from "@/server/terms";
import { jsonError } from "@/server/http";
import { clientKey, memoryRateLimiter } from "@/server/ratelimit";

export const runtime = "nodejs";

/**
 * Video files are not stored. Covering a video is not available, and the original
 * must not be published by mistake. Words and covered photos use /api/stories.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.creatorProfile) return jsonError(403, "CREATOR_ONLY");
  if (termsDecision(user) === "TERMS_REQUIRED") return jsonError(403, "TERMS_REQUIRED");
  const limit = memoryRateLimiter.consume(clientKey(request, "upload", user.id), 6, 60 * 60 * 1000);
  if (!limit.ok) return jsonError(429, "RATE_LIMITED");
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (file instanceof File && file.size > 0) return jsonError(400, "VIDEO_REDACTION_UNSUPPORTED");
  return jsonError(400, "USE_STORY");
}

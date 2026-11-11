import { getCurrentUser } from "@/server/auth";
import { jsonError } from "@/server/http";
import { parseRegions, redactImage } from "@/server/redact";

export const runtime = "nodejs";

/** Returns the covered PNG and stores nothing. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.creatorProfile) return jsonError(403, "CREATOR_ONLY");
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return jsonError(400, "FILE_REQUIRED");
  let regions: unknown = [];
  try {
    regions = JSON.parse(String(form.get("regions") ?? "[]"));
  } catch {
    return jsonError(400, "REGIONS_REQUIRED");
  }
  try {
    const png = redactImage(Buffer.from(await file.arrayBuffer()), parseRegions(regions, false));
    return new Response(new Uint8Array(png), {
      headers: { "content-type": "image/png", "cache-control": "no-store", "x-redaction": "baked-pixels" },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNSAFE_MEDIA";
    if (code === "VIDEO_REDACTION_UNSUPPORTED" || code === "UNSAFE_MEDIA" || code === "REGIONS_REQUIRED" || code === "FILE_TOO_LARGE") {
      return jsonError(400, code);
    }
    throw error;
  }
}

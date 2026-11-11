import { NextResponse } from "next/server";
import { CONTENT_RULES_VERSION } from "@/config/app";
import { audit } from "@/server/audit";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { jsonError } from "@/server/http";
import { clientKey, memoryRateLimiter } from "@/server/ratelimit";
import { createPhotoStory, createTextStory, parseDeed, parseVisibility } from "@/server/stories";

export const runtime = "nodejs";

async function circleFor(userId: string, creatorId: string, circleIdRaw: string) {
  if (!circleIdRaw) return null;
  const member = await db.circleParticipant.findUnique({
    where: { circleId_creatorId: { circleId: circleIdRaw, creatorId } },
  });
  if (!member) return "NOT_IN_CIRCLE" as const;
  return circleIdRaw;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.creatorProfile) return jsonError(403, "CREATOR_ONLY");
  const limit = memoryRateLimiter.consume(clientKey(request, "story", user.id), 12, 60 * 60 * 1000);
  if (!limit.ok) return jsonError(429, "RATE_LIMITED");

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null);
    const title = String(body?.title ?? "").trim();
    const caption = String(body?.caption ?? "").trim();
    const deed = parseDeed(String(body?.deedKind ?? ""));
    const visibility = parseVisibility(String(body?.visibility ?? "DRAFT"));
    if (!deed || !visibility || title.length < 2 || title.length > 120 || caption.length < 2 || caption.length > 800) {
      return jsonError(400, "INVALID");
    }
    const circle = await circleFor(user.id, user.creatorProfile.id, String(body?.circleId ?? "").trim());
    if (circle === "NOT_IN_CIRCLE") return jsonError(400, "NOT_IN_CIRCLE");
    const created = await createTextStory({
      actorId: user.id,
      creatorId: user.creatorProfile.id,
      title,
      caption,
      deedKind: deed,
      visibility,
      circleId: circle,
    });
    await audit({ actorId: user.id, action: "STORY_TEXT", entityType: "Video", entityId: created.story.id, metadata: { visibility, rules: CONTENT_RULES_VERSION } });
    return NextResponse.json({ id: created.story.id, slug: user.creatorProfile.slug, status: created.status, visibility: created.story.visibility });
  }

  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  const caption = String(form.get("caption") ?? "").trim();
  const deed = parseDeed(String(form.get("deedKind") ?? ""));
  const visibility = parseVisibility(String(form.get("visibility") ?? "DRAFT"));
  const peopleNote = form.get("peopleNote") === "COVERED" ? "COVERED" : form.get("peopleNote") === "NO_FACES" ? "NO_FACES" : null;
  const file = form.get("file");
  if (!deed || !visibility || !peopleNote || title.length < 2 || caption.length < 2) return jsonError(400, "INVALID");
  if (!(file instanceof File) || file.size === 0) return jsonError(400, "FILE_REQUIRED");
  const circle = await circleFor(user.id, user.creatorProfile.id, String(form.get("circleId") ?? "").trim());
  if (circle === "NOT_IN_CIRCLE") return jsonError(400, "NOT_IN_CIRCLE");
  let regions: unknown = [];
  try {
    regions = JSON.parse(String(form.get("regions") ?? "[]"));
  } catch {
    return jsonError(400, "REGIONS_REQUIRED");
  }
  try {
    const created = await createPhotoStory({
      actorId: user.id,
      creatorId: user.creatorProfile.id,
      title,
      caption,
      deedKind: deed,
      visibility,
      peopleNote,
      reviewed: form.get("reviewed") === "true",
      bytes: Buffer.from(await file.arrayBuffer()),
      regions,
      circleId: circle,
    });
    if ("error" in created && created.error) return jsonError(created.error === "REVIEW_REQUIRED" ? 400 : 503, created.error);
    await audit({
      actorId: user.id,
      action: "STORY_PHOTO",
      entityType: "Video",
      entityId: created.story.id,
      metadata: { visibility, peopleNote, bytes: "redacted-png" },
    });
    return NextResponse.json({ id: created.story.id, slug: user.creatorProfile.slug, status: created.status, playbackUrl: created.story.playbackUrl });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "VIDEO_REDACTION_UNSUPPORTED" || code === "UNSAFE_MEDIA" || code === "REGIONS_REQUIRED" || code === "FILE_TOO_LARGE") {
      return jsonError(400, code);
    }
    if (code === "STORAGE_NOT_CONFIGURED") return jsonError(503, code);
    throw error;
  }
}

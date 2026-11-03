import { NextResponse } from "next/server";
import { CONTENT_RULES_VERSION } from "@/config/app";
import { audit } from "@/server/audit";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { jsonError } from "@/server/http";
import { clientKey, memoryRateLimiter } from "@/server/ratelimit";
import { getVideoStorage } from "@/server/storage";
import { deedKind } from "@/server/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.creatorProfile) return jsonError(403, "CREATOR_ONLY");
  const limit = memoryRateLimiter.consume(clientKey(request, "upload", user.id), 6, 60 * 60 * 1000);
  if (!limit.ok) return jsonError(429, "RATE_LIMITED");

  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  const caption = String(form.get("caption") ?? "").trim();
  const parsedDeed = deedKind.safeParse(String(form.get("deedKind") ?? ""));
  const consent = form.get("consent") === "true" || form.get("consent") === "on";
  const circleIdRaw = String(form.get("circleId") ?? "").trim();
  const file = form.get("file");

  if (!consent) return jsonError(400, "CONSENT_REQUIRED");
  if (!parsedDeed.success || title.length < 2 || title.length > 120 || caption.length < 2 || caption.length > 800) {
    return jsonError(400, "INVALID");
  }
  if (!(file instanceof File) || file.size === 0) return jsonError(400, "FILE_REQUIRED");

  let circleId: string | null = null;
  if (circleIdRaw) {
    const member = await db.circleParticipant.findUnique({
      where: { circleId_creatorId: { circleId: circleIdRaw, creatorId: user.creatorProfile.id } },
    });
    if (!member) return jsonError(400, "NOT_IN_CIRCLE");
    circleId = circleIdRaw;
  }

  const stored = await getVideoStorage().save({
    data: Buffer.from(await file.arrayBuffer()),
    contentType: file.type || "application/octet-stream",
    filename: file.name || "video.mp4",
  });

  const video = await db.video.create({
    data: {
      creatorId: user.creatorProfile.id,
      title,
      caption,
      storageKey: stored.key,
      playbackUrl: stored.playbackUrl,
      deedKind: parsedDeed.data,
      circleId,
      consentConfirmed: true,
      rulesVersion: CONTENT_RULES_VERSION,
      moderationStatus: "VISIBLE",
    },
  });
  await audit({
    actorId: user.id,
    action: "VIDEO_UPLOAD",
    entityType: "Video",
    entityId: video.id,
    metadata: { storage: getVideoStorage().driver },
  });
  return NextResponse.json({ id: video.id, slug: user.creatorProfile.slug });
}

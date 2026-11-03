import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { jsonError } from "@/server/http";
import { clientKey, memoryRateLimiter } from "@/server/ratelimit";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED");
  const limit = memoryRateLimiter.consume(clientKey(request, "bless", user.id), 80, 60 * 60 * 1000);
  if (!limit.ok) return jsonError(429, "RATE_LIMITED");
  const { id } = await context.params;
  const video = await db.video.findUnique({ where: { id } });
  if (!video || video.moderationStatus !== "VISIBLE") return jsonError(404, "NOT_FOUND");

  const existing = await db.blessing.findUnique({ where: { userId_videoId: { userId: user.id, videoId: id } } });
  if (existing) {
    await db.blessing.delete({ where: { id: existing.id } });
    return NextResponse.json({ blessed: false });
  }
  await db.blessing.create({ data: { userId: user.id, videoId: id } });
  return NextResponse.json({ blessed: true });
}

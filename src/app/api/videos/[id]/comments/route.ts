import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { jsonError } from "@/server/http";
import { reviewComment } from "@/server/moderation";
import { clientKey, memoryRateLimiter } from "@/server/ratelimit";
import { commentBody } from "@/server/validators";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const comments = await db.comment.findMany({
    where: { videoId: id, moderationStatus: "VISIBLE" },
    orderBy: { createdAt: "asc" },
    take: 80,
    include: { user: { select: { name: true } } },
  });
  return NextResponse.json({
    comments: comments.map((comment) => ({
      id: comment.id,
      body: comment.body,
      author: comment.user.name,
      createdAt: comment.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED");
  const limit = memoryRateLimiter.consume(clientKey(request, "comment", user.id), 8, 5 * 60 * 1000);
  if (!limit.ok) return jsonError(429, "RATE_LIMITED");
  const { id } = await context.params;
  const parsed = commentBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "INVALID");
  const video = await db.video.findUnique({ where: { id } });
  if (!video || video.moderationStatus !== "VISIBLE") return jsonError(404, "NOT_FOUND");

  const review = reviewComment(parsed.data.body);
  const comment = await db.comment.create({
    data: {
      userId: user.id,
      videoId: id,
      body: parsed.data.body,
      moderationStatus: review.status === "FLAGGED" ? "FLAGGED" : "VISIBLE",
      moderationNote: review.note,
    },
  });
  if (review.status === "FLAGGED") {
    await audit({
      actorId: user.id,
      action: "COMMENT_FLAGGED",
      entityType: "Comment",
      entityId: comment.id,
      metadata: { note: review.note ?? null },
    });
  }
  return NextResponse.json({ id: comment.id, status: comment.moderationStatus });
}

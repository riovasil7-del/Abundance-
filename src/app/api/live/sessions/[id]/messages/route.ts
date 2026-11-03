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
  const messages = await db.liveMessage.findMany({
    where: { sessionId: id, moderationStatus: "VISIBLE" },
    orderBy: { createdAt: "asc" },
    take: 80,
    include: { user: { select: { name: true } } },
  });
  return NextResponse.json({
    messages: messages.map((message) => ({
      id: message.id,
      body: message.body,
      author: message.user.name,
      createdAt: message.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED");
  const limit = memoryRateLimiter.consume(clientKey(request, "live-chat", user.id), 8, 5 * 60 * 1000);
  if (!limit.ok) return jsonError(429, "RATE_LIMITED");
  const { id } = await context.params;
  const parsed = commentBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "INVALID");
  const session = await db.liveSession.findUnique({ where: { id } });
  if (!session || session.status !== "LIVE") return jsonError(404, "NOT_FOUND");

  const review = reviewComment(parsed.data.body);
  const message = await db.liveMessage.create({
    data: {
      sessionId: id,
      userId: user.id,
      body: parsed.data.body,
      moderationStatus: review.status === "FLAGGED" ? "FLAGGED" : "VISIBLE",
      moderationNote: review.note,
    },
  });
  if (review.status === "FLAGGED") {
    await audit({
      actorId: user.id,
      action: "LIVE_CHAT_FLAGGED",
      entityType: "LiveMessage",
      entityId: message.id,
      metadata: { note: review.note ?? null },
    });
  }
  return NextResponse.json({ id: message.id, status: message.moderationStatus });
}

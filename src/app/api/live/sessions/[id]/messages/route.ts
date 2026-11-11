import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { jsonError } from "@/server/http";
import { publishRoomEvent } from "@/server/live-events";
import { reviewComment } from "@/server/moderation";
import { commentBody } from "@/server/validators";
import { clientKey, memoryRateLimiter } from "@/server/ratelimit";
import { CHAT_RATE_LIMIT, CHAT_RATE_WINDOW_MS, giftRoomLine, joinRoomLine, type RoomLine } from "@/lib/live-chat";

const counted = ["HELD", "AVAILABLE", "PAID_OUT"] as const;

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  const [blocked, muted] = await Promise.all([
    user ? db.userBlock.findMany({ where: { blockerId: user.id }, select: { blockedId: true } }) : Promise.resolve([]),
    db.liveChatMute.findMany({ where: { sessionId: id }, select: { userId: true } }),
  ]);
  const blockedIds = new Set(blocked.map((row) => row.blockedId));
  const mutedIds = new Set(muted.map((row) => row.userId));
  const [messages, gifts] = await Promise.all([
    db.liveMessage.findMany({
      where: { sessionId: id, moderationStatus: "VISIBLE" },
      orderBy: { createdAt: "asc" },
      take: 80,
      include: { user: { select: { id: true, name: true } } },
    }),
    db.ledgerTransaction.findMany({
      where: { liveSessionId: id, status: { in: [...counted] } },
      orderBy: { createdAt: "asc" },
      take: 40,
      include: { gift: true, donor: { select: { name: true } } },
    }),
  ]);
  const visible = messages.filter((message) => !blockedIds.has(message.user.id) && !mutedIds.has(message.user.id));
  const blessingNetCents = gifts.reduce((sum, gift) => sum + gift.netCents, 0);
  return NextResponse.json({
    messages: visible.map((message) => ({
      id: message.id,
      kind: message.kind === "join" ? "join" : "chat",
      body: message.body,
      author: message.user.name,
      authorId: message.user.id,
      createdAt: message.createdAt.toISOString(),
    })),
    lines: [
      ...visible.map((message): RoomLine =>
        message.kind === "join"
          ? joinRoomLine({ id: message.id, author: message.user.name, authorId: message.user.id, createdAt: message.createdAt.toISOString() })
          : {
              id: message.id,
              kind: "chat",
              body: message.body,
              author: message.user.name,
              authorId: message.user.id,
              createdAt: message.createdAt.toISOString(),
            },
      ),
      ...gifts
        .filter((gift) => !blockedIds.has(gift.donorId) && !mutedIds.has(gift.donorId))
        .map((gift) =>
          giftRoomLine({
            id: gift.id,
            author: gift.anonymous ? "" : gift.donor.name,
            authorId: gift.donorId,
            gift: `${gift.gift?.symbol ?? "✦"} ${gift.gift?.nameEn ?? ""}`.trim(),
            createdAt: gift.createdAt.toISOString(),
          }),
        ),
    ].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    blessingNetCents,
    gifts: gifts.map((gift) => ({
      id: gift.id,
      symbol: gift.gift?.symbol ?? "✦",
      name: gift.gift?.nameSk ?? "",
      donorName: gift.anonymous ? "" : gift.donor.name,
      netCents: gift.netCents,
      grossCents: gift.grossCents,
      feeCents: gift.feeCents,
    })),
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED");
  const limit = memoryRateLimiter.consume(clientKey(request, "live-chat", user.id), CHAT_RATE_LIMIT, CHAT_RATE_WINDOW_MS);
  if (!limit.ok) return jsonError(429, "RATE_LIMITED");
  const { id } = await context.params;
  const raw = await request.json().catch(() => null);
  const kind = raw && typeof raw === "object" && raw.kind === "join" ? "join" : "chat";
  const session = await db.liveSession.findUnique({ where: { id } });
  if (!session || session.status !== "LIVE") return jsonError(404, "NOT_FOUND");
  const silenced = await db.liveChatMute.findUnique({ where: { sessionId_userId: { sessionId: id, userId: user.id } } });
  if (silenced) return jsonError(403, "CHAT_MUTED");
  if (kind === "join") {
    const existing = await db.liveMessage.findFirst({ where: { sessionId: id, userId: user.id, kind: "join" } });
    if (existing) return NextResponse.json({ id: existing.id, status: existing.moderationStatus, kind: "join" });
    const message = await db.liveMessage.create({
      data: { sessionId: id, userId: user.id, body: user.name, kind: "join", moderationStatus: "VISIBLE" },
    });
    await publishRoomEvent(session.roomName, { type: "chat", id: message.id, author: user.name, authorId: user.id, body: "", kind: "join" });
    return NextResponse.json({ id: message.id, status: "VISIBLE", kind: "join", author: user.name, authorId: user.id, body: "" });
  }
  const parsed = commentBody.safeParse(raw);
  if (!parsed.success) return jsonError(400, "INVALID");

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
    return NextResponse.json({ id: message.id, status: message.moderationStatus });
  }
  await publishRoomEvent(session.roomName, {
    type: "chat",
    id: message.id,
    author: user.name,
    authorId: user.id,
    body: message.body,
  });
  return NextResponse.json({
    id: message.id,
    status: message.moderationStatus,
    author: user.name,
    authorId: user.id,
    body: message.body,
  });
}

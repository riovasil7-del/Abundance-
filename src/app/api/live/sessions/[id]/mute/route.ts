import { NextResponse } from "next/server";
import { z } from "zod";
import { audit } from "@/server/audit";
import { getCurrentUser } from "@/server/auth";
import { canModerateChat } from "@/lib/live-chat";
import { db } from "@/server/db";
import { jsonError } from "@/server/http";
import { publishRoomEvent } from "@/server/live-events";

const bodySchema = z.object({
  userId: z.string().trim().min(1).max(80),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED");
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "INVALID");
  if (parsed.data.userId === user.id) return jsonError(400, "INVALID");
  const { id } = await context.params;
  const session = await db.liveSession.findUnique({ where: { id } });
  if (!session) return jsonError(404, "NOT_FOUND");
  const cohost = await db.liveInvite.findFirst({
    where: { sessionId: id, inviteeId: user.id, status: "ACCEPTED" },
    select: { id: true },
  });
  const isHost = user.creatorProfile?.id === session.hostId;
  if (!canModerateChat({ isHost, isCohost: Boolean(cohost), role: user.role })) return jsonError(403, "FORBIDDEN");
  await db.liveChatMute.upsert({
    where: { sessionId_userId: { sessionId: id, userId: parsed.data.userId } },
    update: { actorId: user.id },
    create: { sessionId: id, userId: parsed.data.userId, actorId: user.id },
  });
  await db.liveMessage.updateMany({
    where: { sessionId: id, userId: parsed.data.userId, moderationStatus: "VISIBLE" },
    data: { moderationStatus: "HIDDEN" },
  });
  await publishRoomEvent(session.roomName, { type: "chat-mute", authorId: parsed.data.userId });
  await audit({
    actorId: user.id,
    action: "LIVE_CHAT_MUTE",
    entityType: "LiveSession",
    entityId: id,
    metadata: { userId: parsed.data.userId },
  });
  return NextResponse.json({ ok: true });
}

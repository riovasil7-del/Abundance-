import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { getCurrentUser } from "@/server/auth";
import { canModerateChat } from "@/lib/live-chat";
import { db } from "@/server/db";
import { jsonError } from "@/server/http";
import { publishRoomEvent } from "@/server/live-events";

export async function POST(_request: Request, context: { params: Promise<{ id: string; messageId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED");
  const { id, messageId } = await context.params;
  const session = await db.liveSession.findUnique({ where: { id } });
  if (!session) return jsonError(404, "NOT_FOUND");
  const isHost = user.creatorProfile?.id === session.hostId;
  if (!canModerateChat({ isHost, role: user.role })) return jsonError(403, "FORBIDDEN");
  const message = await db.liveMessage.findUnique({ where: { id: messageId } });
  if (!message || message.sessionId !== id) return jsonError(404, "NOT_FOUND");
  await db.liveMessage.update({ where: { id: messageId }, data: { moderationStatus: "HIDDEN" } });
  await audit({
    actorId: user.id,
    action: "LIVE_CHAT_REMOVE",
    entityType: "LiveMessage",
    entityId: messageId,
  });
  await publishRoomEvent(session.roomName, { type: "chat-remove", id: messageId });
  return NextResponse.json({ ok: true });
}

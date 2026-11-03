import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { jsonError } from "@/server/http";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.creatorProfile) return jsonError(403, "CREATOR_ONLY");
  const { id } = await context.params;
  const session = await db.liveSession.findUnique({ where: { id } });
  if (!session) return jsonError(404, "NOT_FOUND");
  if (session.hostId !== user.creatorProfile.id) return jsonError(403, "FORBIDDEN");
  await db.liveSession.update({
    where: { id },
    data: { status: "ENDED", endedAt: new Date() },
  });
  await audit({
    actorId: user.id,
    action: "LIVE_SESSION_END",
    entityType: "LiveSession",
    entityId: id,
  });
  return NextResponse.json({ ok: true });
}

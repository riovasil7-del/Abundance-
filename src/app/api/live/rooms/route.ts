import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { getCurrentUser } from "@/server/auth";
import { jsonError } from "@/server/http";
import { getLiveProvider } from "@/server/live";

export async function POST() {
  const user = await getCurrentUser();
  if (!user?.creatorProfile) return jsonError(403, "CREATOR_ONLY");
  const room = await getLiveProvider().createRoom(user.creatorProfile.id);
  await audit({
    actorId: user.id,
    action: "LIVE_ROOM_STUB",
    entityType: "CreatorProfile",
    entityId: user.creatorProfile.id,
    metadata: { provider: room.provider, roomId: room.roomId },
  });
  return NextResponse.json(room);
}

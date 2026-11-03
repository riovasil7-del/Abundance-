import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { getCurrentUser } from "@/server/auth";
import { jsonError } from "@/server/http";
import { readLiveKitCredentials } from "@/server/live-access";
import { openLiveSession } from "@/server/live-sessions";

export async function POST() {
  const user = await getCurrentUser();
  if (!user?.creatorProfile) return jsonError(403, "CREATOR_ONLY");
  if (!readLiveKitCredentials()) return jsonError(503, "LIVE_NOT_CONFIGURED");
  const session = await openLiveSession({ host: user.creatorProfile });
  await audit({
    actorId: user.id,
    action: "LIVE_SESSION_OPEN",
    entityType: "LiveSession",
    entityId: session.id,
  });
  return NextResponse.json({ id: session.id, configured: true });
}

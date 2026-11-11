import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { jsonError } from "@/server/http";
import { mayIssuePublishGrant, readLiveKitCredentials, tokenForParticipant } from "@/server/live-access";
import { loadLiveAudience } from "@/server/live-sessions";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const credentials = readLiveKitCredentials();
  if (!credentials) return jsonError(503, "LIVE_NOT_CONFIGURED");

  const { id } = await context.params;
  const loaded = await loadLiveAudience(id);
  if (!loaded) return jsonError(404, "NOT_FOUND");
  if (loaded.session.status !== "LIVE") return jsonError(410, "LIVE_ENDED");

  const user = await getCurrentUser();
  const identity = user?.id ?? `guest_${randomUUID()}`;
  const name = user?.name ?? "Hosť";
  const audience = user ? loaded.audience : { hostUserId: loaded.audience.hostUserId, circlePublisherUserIds: [] as string[] };
  const { token } = await tokenForParticipant({
    credentials,
    userId: identity,
    name,
    room: loaded.session.roomName,
    audience,
  });

  return NextResponse.json({
    token,
    url: credentials.url,
    canPublish: mayIssuePublishGrant(user, audience),
    configured: true,
  });
}

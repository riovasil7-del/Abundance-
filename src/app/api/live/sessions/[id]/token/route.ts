import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { jsonError } from "@/server/http";
import { canPublishToRoom, mayIssuePublishGrant, readLiveKitCredentials, tokenForParticipant } from "@/server/live-access";
import { serverPublishGrant } from "@/server/community-rules";
import { loadLiveAudience } from "@/server/live-sessions";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const credentials = readLiveKitCredentials();
  if (!credentials) return jsonError(503, "LIVE_NOT_CONFIGURED");

  const { id } = await context.params;
  const loaded = await loadLiveAudience(id);
  if (!loaded) return jsonError(404, "NOT_FOUND");
  if (loaded.session.status !== "LIVE") return jsonError(410, "LIVE_ENDED");

  const user = await getCurrentUser();
  const raw = await request.json().catch(() => ({}));
  const clientRequestedPublish = Boolean(raw && typeof raw === "object" && "canPublish" in raw && raw.canPublish);
  const identity = user?.id ?? `guest_${randomUUID()}`;
  const name = user?.name ?? "Hosť";
  const audience = user ? loaded.audience : { hostUserId: loaded.audience.hostUserId, circlePublisherUserIds: [], cohostUserIds: [] as string[] };
  const grant = serverPublishGrant(identity, audience, clientRequestedPublish, canPublishToRoom);
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
    canPublish: mayIssuePublishGrant(user, audience) && grant.canPublish,
    configured: true,
  });
}

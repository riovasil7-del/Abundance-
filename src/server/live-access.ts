import { AccessToken, TokenVerifier, type VideoGrant } from "livekit-server-sdk";

/**
 * Who may publish in a room.
 * A solo room lists no circle publishers: only the creator who opened it can publish.
 * A blessing-circle room lists every participant creator. Supporters never publish.
 * There is no rank and no "winner" grant.
 */
export type LiveAudience = {
  hostUserId: string;
  circlePublisherUserIds: readonly string[] | null;
};

export function canPublishToRoom(userId: string, audience: LiveAudience): boolean {
  if (!userId) return false;
  if (userId === audience.hostUserId) return true;
  return Boolean(audience.circlePublisherUserIds?.includes(userId));
}

/** A publish grant requires the age declaration and a creator profile, then the room audience. */
export function mayIssuePublishGrant(
  user: { id: string; adultAttestedAt: Date | null; creatorProfile?: unknown } | null,
  audience: LiveAudience,
): boolean {
  if (!user?.adultAttestedAt || !user.creatorProfile) return false;
  return canPublishToRoom(user.id, audience);
}

export function videoGrant(room: string, canPublish: boolean): VideoGrant {
  return {
    room,
    roomJoin: true,
    canPublish,
    canSubscribe: true,
    // Hearts travel as data. Video publish stays limited to the room's creators.
    canPublishData: true,
  };
}

export type LiveKitCredentials = {
  url: string;
  apiKey: string;
  apiSecret: string;
};

/** Missing or blank keys mean live is off. Callers show a configured state instead of throwing. */
export function readLiveKitCredentials(
  env: Record<string, string | undefined> = process.env,
): LiveKitCredentials | null {
  const url = env.LIVEKIT_URL?.trim();
  const apiKey = env.LIVEKIT_API_KEY?.trim();
  const apiSecret = env.LIVEKIT_API_SECRET?.trim();
  if (!url || !apiKey || !apiSecret) return null;
  return { url, apiKey, apiSecret };
}

export async function createParticipantToken(input: {
  apiKey: string;
  apiSecret: string;
  identity: string;
  name: string;
  room: string;
  canPublish: boolean;
}): Promise<string> {
  const token = new AccessToken(input.apiKey, input.apiSecret, {
    identity: input.identity,
    name: input.name,
    ttl: "2h",
  });
  token.addGrant(videoGrant(input.room, input.canPublish));
  return token.toJwt();
}

/** The only way a route should mint a token: the grant comes from canPublishToRoom. */
export async function tokenForParticipant(input: {
  credentials: LiveKitCredentials;
  userId: string;
  name: string;
  room: string;
  audience: LiveAudience;
}): Promise<{ token: string; canPublish: boolean }> {
  const canPublish = canPublishToRoom(input.userId, input.audience);
  const token = await createParticipantToken({
    apiKey: input.credentials.apiKey,
    apiSecret: input.credentials.apiSecret,
    identity: input.userId,
    name: input.name,
    room: input.room,
    canPublish,
  });
  return { token, canPublish };
}

export async function readVideoGrant(token: string, apiKey: string, apiSecret: string): Promise<VideoGrant | undefined> {
  const claims = await new TokenVerifier(apiKey, apiSecret).verify(token);
  return claims.video;
}

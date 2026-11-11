import { randomUUID } from "node:crypto";
import { db } from "./db";
import type { LiveAudience } from "./live-access";

export async function openLiveSession(input: {
  host: { id: string; displayName: string };
  title?: string | null;
  circleId?: string | null;
}) {
  if (input.circleId) {
    const member = await db.circleParticipant.findUnique({
      where: { circleId_creatorId: { circleId: input.circleId, creatorId: input.host.id } },
      include: { circle: true },
    });
    if (!member || member.circle.status !== "OPEN") throw new Error("NOT_IN_CIRCLE");
    const existing = await db.liveSession.findFirst({
      where: { circleId: input.circleId, status: "LIVE" },
    });
    if (existing) return existing;
    const suffix = randomUUID().slice(0, 8);
    return db.liveSession.create({
      data: {
        roomName: `circle_${input.circleId}_${suffix}`,
        hostId: input.host.id,
        circleId: input.circleId,
        title: input.title?.trim() || member.circle.title,
      },
    });
  }

  const existing = await db.liveSession.findFirst({
    where: { hostId: input.host.id, circleId: null, status: "LIVE" },
  });
  if (existing) return existing;
  const suffix = randomUUID().slice(0, 8);
  return db.liveSession.create({
    data: {
      roomName: `solo_${input.host.id}_${suffix}`,
      hostId: input.host.id,
      title: input.title?.trim() || input.host.displayName,
    },
  });
}

export async function loadLiveAudience(sessionId: string): Promise<{
  session: NonNullable<Awaited<ReturnType<typeof fetchSession>>>;
  audience: LiveAudience;
} | null> {
  const session = await fetchSession(sessionId);
  if (!session) return null;
  return {
    session,
    audience: {
      hostUserId: session.host.user.adultAttestedAt ? session.host.userId : "",
      circlePublisherUserIds: session.circle
        ? session.circle.participants
            .filter((participant) => participant.creator.user.adultAttestedAt)
            .map((participant) => participant.creator.userId)
        : null,
    },
  };
}

function fetchSession(sessionId: string) {
  return db.liveSession.findUnique({
    where: { id: sessionId },
    include: {
      host: { include: { user: true } },
      circle: {
        include: {
          participants: { include: { creator: { include: { user: true } } }, orderBy: { joinedAt: "asc" } },
        },
      },
    },
  });
}

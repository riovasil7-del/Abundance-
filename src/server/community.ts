import { Prisma } from "@prisma/client";
import { LIVE_MAX_COHOSTS } from "../config/app";
import { db } from "./db";
import { reviewComment } from "./moderation";
import { consumeDurableLimit } from "./ratelimit";
import {
  acceptDecision,
  followDecision,
  inviteDecision,
  revokeDecision,
  type InviteStatus,
} from "./community-rules";

async function blockedEither(a: string, b: string): Promise<boolean> {
  const row = await db.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
    select: { id: true },
  });
  return Boolean(row);
}

export async function followCreator(followerId: string | null, creatorUserId: string) {
  const creator = creatorUserId
    ? await db.creatorProfile.findUnique({ where: { userId: creatorUserId }, select: { id: true } })
    : null;
  const blocked = followerId ? await blockedEither(followerId, creatorUserId) : false;
  const decision = followDecision({
    followerId,
    creatorUserId,
    creatorExists: Boolean(creator),
    blocked,
  });
  if (decision !== "OK" || !followerId) return { error: decision };
  try {
    const follow = await db.follow.upsert({
      where: { followerId_creatorId: { followerId, creatorId: creatorUserId } },
      create: { followerId, creatorId: creatorUserId },
      update: {},
    });
    return { follow };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const follow = await db.follow.findUnique({
        where: { followerId_creatorId: { followerId, creatorId: creatorUserId } },
      });
      if (follow) return { follow };
    }
    throw error;
  }
}

export async function unfollowCreator(followerId: string | null, creatorUserId: string) {
  if (!followerId) return { error: "UNAUTHENTICATED" as const };
  await db.follow.deleteMany({ where: { followerId, creatorId: creatorUserId } });
  return { ok: true as const };
}

export async function listFollowing(followerId: string) {
  return db.follow.findMany({
    where: { followerId },
    orderBy: { createdAt: "desc" },
    include: { creator: { include: { creatorProfile: true } } },
  });
}

export async function postCreatorUpdate(userId: string | null, body: string) {
  if (!userId) return { error: "UNAUTHENTICATED" as const };
  const profile = await db.creatorProfile.findUnique({ where: { userId } });
  if (!profile) return { error: "CREATOR_ONLY" as const };
  const review = reviewComment(body);
  const update = await db.creatorUpdate.create({
    data: {
      creatorId: userId,
      body: body.trim(),
      moderationStatus: review.status,
    },
  });
  return { update, status: review.status };
}

export async function listCreatorUpdates(creatorUserId: string) {
  return db.creatorUpdate.findMany({
    where: { creatorId: creatorUserId, moderationStatus: "VISIBLE" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

const ENCOURAGE_LIMIT = 8;
const ENCOURAGE_WINDOW_MS = 60 * 60 * 1000;

export async function sendEncouragement(input: {
  fromUserId: string | null;
  toUserId: string;
  kind: "THANKS" | "HELPFUL";
  body: string;
}) {
  if (!input.fromUserId) return { error: "UNAUTHENTICATED" as const };
  if (input.fromUserId === input.toUserId) return { error: "SELF" as const };
  const recipient = await db.user.findUnique({
    where: { id: input.toUserId },
    select: { id: true, creatorProfile: { select: { id: true } } },
  });
  if (!recipient?.creatorProfile) return { error: "NOT_CREATOR" as const };
  if (await blockedEither(input.fromUserId, input.toUserId)) return { error: "BLOCKED" as const };
  const limit = await consumeDurableLimit("encourage", input.fromUserId, ENCOURAGE_LIMIT, ENCOURAGE_WINDOW_MS);
  if (!limit.ok) return { error: "RATE_LIMITED" as const };
  const text = input.kind === "HELPFUL" ? input.body.trim() || "helpful" : input.body.trim();
  const review = reviewComment(text);
  if (review.status !== "VISIBLE") return { error: "HELD" as const, note: review.note };
  const note = await db.encouragement.create({
    data: {
      fromUserId: input.fromUserId,
      toUserId: input.toUserId,
      kind: input.kind,
      body: text,
      moderationStatus: "VISIBLE",
    },
  });
  return { note };
}

export async function listPrivateNotes(userId: string) {
  return db.encouragement.findMany({
    where: { toUserId: userId, moderationStatus: "VISIBLE" },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { fromUser: { select: { id: true, name: true } } },
  });
}

export async function inviteCohost(input: { actorId: string | null; sessionId: string; inviteeId: string }) {
  const session = await db.liveSession.findUnique({
    where: { id: input.sessionId },
    include: { host: true },
  });
  if (!session || session.status !== "LIVE") return { error: "NOT_FOUND" as const };
  const invitee = await db.user.findUnique({
    where: { id: input.inviteeId },
    select: { id: true, creatorProfile: { select: { id: true } }, adultAttestedAt: true },
  });
  const blocked = input.actorId ? await blockedEither(input.actorId, input.inviteeId) : false;
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`live-invite:${input.sessionId}`}))`;
    const existing = await tx.liveInvite.findUnique({
      where: { sessionId_inviteeId: { sessionId: input.sessionId, inviteeId: input.inviteeId } },
    });
    const openInvites = await tx.liveInvite.count({
      where: { sessionId: input.sessionId, status: { in: ["PENDING", "ACCEPTED"] } },
    });
    const alreadyOpen = existing?.status === "PENDING" || existing?.status === "ACCEPTED";
    const decision = inviteDecision({
      actorId: input.actorId,
      hostUserId: session.host.userId,
      inviteeId: input.inviteeId,
      inviteeIsCreator: Boolean(invitee?.creatorProfile && invitee.adultAttestedAt),
      openInvites: alreadyOpen ? Math.max(0, openInvites - 1) : openInvites,
      blocked,
    });
    if (decision !== "OK") return { error: decision };
    if (existing?.status === "ACCEPTED" || existing?.status === "PENDING") return { invite: existing };
    const invite = existing
      ? await tx.liveInvite.update({
          where: { id: existing.id },
          data: { status: "PENDING", consentAt: null },
        })
      : await tx.liveInvite.create({
          data: { sessionId: input.sessionId, inviteeId: input.inviteeId, status: "PENDING" },
        });
    return { invite };
  });
}

export async function respondToInvite(input: {
  actorId: string | null;
  inviteId: string;
  action: "accept" | "decline" | "revoke";
  consent: boolean;
}) {
  const invite = await db.liveInvite.findUnique({
    where: { id: input.inviteId },
    include: { session: { include: { host: true } } },
  });
  if (!invite || invite.session.status !== "LIVE") return { error: "NOT_FOUND" as const };
  const status = invite.status as InviteStatus;
  if (input.action === "revoke") {
    const decision = revokeDecision({
      actorId: input.actorId,
      hostUserId: invite.session.host.userId,
      status,
    });
    if (decision !== "OK" && decision !== "ALREADY_CLOSED") return { error: decision };
    const updated = await db.liveInvite.update({ where: { id: invite.id }, data: { status: "REVOKED" } });
    return { invite: updated };
  }
  if (input.action === "decline") {
    if (!input.actorId) return { error: "UNAUTHENTICATED" as const };
    if (input.actorId !== invite.inviteeId) return { error: "NOT_INVITEE" as const };
    const updated = await db.liveInvite.update({ where: { id: invite.id }, data: { status: "DECLINED" } });
    return { invite: updated };
  }
  const decision = acceptDecision({
    actorId: input.actorId,
    inviteeId: invite.inviteeId,
    status,
    consent: input.consent || status === "ACCEPTED",
  });
  if (decision !== "OK") return { error: decision };
  if (status === "ACCEPTED") return { invite };
  const updated = await db.liveInvite.update({
    where: { id: invite.id },
    data: { status: "ACCEPTED", consentAt: new Date() },
  });
  return { invite: updated };
}

export async function collabView(sessionId: string, actorId: string | null) {
  const session = await db.liveSession.findUnique({
    where: { id: sessionId },
    include: {
      host: true,
      circle: { include: { participants: { include: { creator: true } } } },
      invites: { include: { invitee: { include: { creatorProfile: true } } } },
    },
  });
  if (!session) return null;
  const isHost = actorId === session.host.userId;
  const candidates = isHost
    ? await db.creatorProfile.findMany({
        where: { userId: { not: session.host.userId }, user: { adultAttestedAt: { not: null } } },
        take: 8,
        orderBy: { displayName: "asc" },
        select: { userId: true, displayName: true },
      })
    : [];
  const accepted = session.invites.filter((invite) => invite.status === "ACCEPTED" && invite.consentAt);
  const recipients = session.circle
    ? session.circle.participants.map((participant) => ({
        creatorId: participant.creator.id,
        userId: participant.creator.userId,
        name: participant.creator.displayName,
      }))
    : [
        { creatorId: session.host.id, userId: session.host.userId, name: session.host.displayName },
        ...accepted
          .filter((invite) => invite.invitee.creatorProfile)
          .map((invite) => ({
            creatorId: invite.invitee.creatorProfile!.id,
            userId: invite.inviteeId,
            name: invite.invitee.creatorProfile!.displayName,
          })),
      ];
  return {
    maxCohosts: LIVE_MAX_COHOSTS,
    isHost,
    canPublish:
      actorId === session.host.userId ||
      accepted.some((invite) => invite.inviteeId === actorId) ||
      Boolean(session.circle?.participants.some((participant) => participant.creator.userId === actorId)),
    pendingForMe: session.invites.find((invite) => invite.inviteeId === actorId && invite.status === "PENDING") ?? null,
    invites: session.invites.map((invite) => ({
      id: invite.id,
      inviteeId: invite.inviteeId,
      name: invite.invitee.creatorProfile?.displayName ?? invite.invitee.name,
      status: invite.status,
    })),
    candidates,
    recipients,
  };
}

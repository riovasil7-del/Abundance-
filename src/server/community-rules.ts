import { LIVE_MAX_COHOSTS } from "../config/app";
import { splitDonation } from "./fees";
import { sharesFromNet, type RecipientShare } from "./ledger";
import type { LiveAudience } from "./live-access";

export type InviteStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "REVOKED";

export function followDecision(input: {
  followerId: string | null;
  creatorUserId: string;
  creatorExists: boolean;
  blocked: boolean;
}): "OK" | "UNAUTHENTICATED" | "SELF" | "NOT_CREATOR" | "BLOCKED" {
  if (!input.followerId) return "UNAUTHENTICATED";
  if (input.followerId === input.creatorUserId) return "SELF";
  if (!input.creatorExists) return "NOT_CREATOR";
  if (input.blocked) return "BLOCKED";
  return "OK";
}

export function inviteDecision(input: {
  actorId: string | null;
  hostUserId: string;
  inviteeId: string;
  inviteeIsCreator: boolean;
  openInvites: number;
  blocked: boolean;
}): "OK" | "UNAUTHENTICATED" | "NOT_HOST" | "SELF" | "NOT_CREATOR" | "FULL" | "BLOCKED" {
  if (!input.actorId) return "UNAUTHENTICATED";
  if (input.actorId !== input.hostUserId) return "NOT_HOST";
  if (input.actorId === input.inviteeId) return "SELF";
  if (!input.inviteeIsCreator) return "NOT_CREATOR";
  if (input.blocked) return "BLOCKED";
  if (input.openInvites >= LIVE_MAX_COHOSTS) return "FULL";
  return "OK";
}

export function acceptDecision(input: {
  actorId: string | null;
  inviteeId: string;
  status: InviteStatus;
  consent: boolean;
}): "OK" | "UNAUTHENTICATED" | "NOT_INVITEE" | "NOT_PENDING" | "CONSENT_REQUIRED" {
  if (!input.actorId) return "UNAUTHENTICATED";
  if (input.actorId !== input.inviteeId) return "NOT_INVITEE";
  if (input.status === "ACCEPTED") return "OK";
  if (input.status !== "PENDING") return "NOT_PENDING";
  if (!input.consent) return "CONSENT_REQUIRED";
  return "OK";
}

export function revokeDecision(input: {
  actorId: string | null;
  hostUserId: string;
  status: InviteStatus;
}): "OK" | "UNAUTHENTICATED" | "NOT_HOST" | "ALREADY_CLOSED" {
  if (!input.actorId) return "UNAUTHENTICATED";
  if (input.actorId !== input.hostUserId) return "NOT_HOST";
  if (input.status === "REVOKED" || input.status === "DECLINED") return "ALREADY_CLOSED";
  return "OK";
}

/** Client canPublish is ignored. Only the server audience may publish. */
export function serverPublishGrant(
  userId: string,
  audience: LiveAudience,
  clientRequestedPublish: boolean,
  canPublish: (userId: string, audience: LiveAudience) => boolean,
): { canPublish: boolean; ignoredClientRequest: boolean } {
  return {
    canPublish: canPublish(userId, audience),
    ignoredClientRequest: clientRequestedPublish,
  };
}

export type GiftShareResult =
  | { error: "NOT_IN_ROOM" }
  | { shares: RecipientShare[]; feeCents: number; netCents: number; grossCents: number; attributedTo: string };

/**
 * A selected creator receives the whole 85 percent.
 * Omitting a selection keeps the host, or the existing even circle split.
 * Accepted co-hosts are not given a silent share.
 */
export function liveGiftShares(input: {
  priceCents: number;
  selectedCreatorId: string | null;
  hostCreatorId: string;
  circleCreatorIds: readonly string[] | null;
  acceptedCohostCreatorIds: readonly string[];
}): GiftShareResult {
  const split = splitDonation(input.priceCents);
  const allowed = new Set<string>([
    input.hostCreatorId,
    ...(input.circleCreatorIds ?? []),
    ...input.acceptedCohostCreatorIds,
  ]);
  if (input.selectedCreatorId) {
    if (!allowed.has(input.selectedCreatorId)) return { error: "NOT_IN_ROOM" };
    return {
      shares: [{ creatorId: input.selectedCreatorId, netCents: split.netCents }],
      feeCents: split.feeCents,
      netCents: split.netCents,
      grossCents: split.grossCents,
      attributedTo: input.selectedCreatorId,
    };
  }
  const circle = input.circleCreatorIds?.filter((id) => id.length > 0) ?? [];
  const ids = circle.length > 0 ? circle : [input.hostCreatorId];
  return {
    shares: sharesFromNet([...ids], split.netCents),
    feeCents: split.feeCents,
    netCents: split.netCents,
    grossCents: split.grossCents,
    attributedTo: ids.length === 1 ? ids[0]! : "circle",
  };
}

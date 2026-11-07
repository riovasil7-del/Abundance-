import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { getCurrentUser } from "@/server/auth";
import { holdDaysFor, orderedVerified } from "@/server/catalog";
import { db } from "@/server/db";
import { jsonError } from "@/server/http";
import { randomUUID } from "node:crypto";
import { CreditError, catalogPriceCents, spendLights } from "@/server/credits";
import { liveGiftShares } from "@/server/community-rules";
import { liveGiftBurst, settleLiveGift } from "@/server/live-gifts";
import { publishRoomEvent } from "@/server/live-events";
import { adultDecision } from "@/server/money";
import { consumeDurableLimit } from "@/server/ratelimit";
import { giftBody } from "@/server/validators";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED");
  if (adultDecision(user) === "AGE_REQUIRED") return jsonError(403, "AGE_REQUIRED");
  const limit = await consumeDurableLimit("donate", user.id, 30, 60 * 60 * 1000);
  if (!limit.ok) return jsonError(429, "RATE_LIMITED");

  const raw = await request.json().catch(() => null);
  const parsed = giftBody.safeParse(raw);
  if (!parsed.success) return jsonError(400, "INVALID");

  const { id } = await context.params;
  const session = await db.liveSession.findUnique({
    where: { id },
    include: {
      host: { include: { user: { select: { adultAttestedAt: true } } } },
      circle: { include: { participants: { include: { creator: true }, orderBy: { joinedAt: "asc" } } } },
    },
  });
  if (!session || session.status !== "LIVE") return jsonError(404, "NOT_FOUND");
  if (!session.host.user.adultAttestedAt) return jsonError(403, "CREATOR_AGE_REQUIRED");

  const gift = await db.gift.findUnique({ where: { slug: parsed.data.giftSlug } });
  if (!gift || gift.priceCents <= 0) return jsonError(404, "UNKNOWN_GIFT");

  const acceptedInvites = await db.liveInvite.findMany({
    where: { sessionId: session.id, status: "ACCEPTED", consentAt: { not: null } },
    include: { invitee: { include: { creatorProfile: true } } },
  });
  const cohostProfiles = acceptedInvites.flatMap((invite) =>
    invite.invitee.creatorProfile && invite.invitee.adultAttestedAt ? [invite.invitee.creatorProfile] : [],
  );
  const circlePeople = session.circle ? orderedVerified(session.circle.participants) : [];
  const catalog = new Map(
    [
      {
        creatorId: session.host.id,
        displayName: session.host.displayName,
        payoutHoldDays: session.host.payoutHoldDays,
        stripeAccountId: session.host.stripeAccountId,
      },
      ...circlePeople,
      ...cohostProfiles.map((profile) => ({
        creatorId: profile.id,
        displayName: profile.displayName,
        payoutHoldDays: profile.payoutHoldDays,
        stripeAccountId: profile.stripeAccountId,
      })),
    ].map((person) => [person.creatorId, person]),
  );
  const priceCents = catalogPriceCents(gift.priceCents, raw);
  const shared = liveGiftShares({
    priceCents,
    selectedCreatorId: parsed.data.recipientCreatorId ?? null,
    hostCreatorId: session.host.id,
    circleCreatorIds: session.circle ? circlePeople.map((person) => person.creatorId) : null,
    acceptedCohostCreatorIds: cohostProfiles.map((profile) => profile.id),
  });
  if ("error" in shared) return jsonError(403, shared.error);
  const recipients = shared.shares.map((share) => catalog.get(share.creatorId)).filter((person) => person != null);
  if (recipients.length !== shared.shares.length || recipients.length === 0) return jsonError(422, "NO_VERIFIED_PARTICIPANTS");
  if (user.creatorProfile && recipients.some((recipient) => recipient.creatorId === user.creatorProfile?.id)) {
    return jsonError(400, "SELF_GIFT");
  }
  const settled = settleLiveGift({
    catalogPriceCents: priceCents,
    untrustedClientAmount: raw,
    verifiedRecipientCount: recipients.length,
  });
  const shares = shared.shares;
  let spent;
  try {
    spent = await spendLights({
      donorId: user.id,
      priceCents,
      token: parsed.data.token ?? randomUUID(),
      kind: shared.attributedTo === "circle" ? "CIRCLE" : "GIFT",
      shares,
      circleId: session.circleId,
      giftId: gift.id,
      anonymous: Boolean(parsed.data.anonymous),
      holdDays: holdDaysFor(recipients),
      liveSessionId: session.id,
      note: "live",
    });
  } catch (error) {
    if (error instanceof CreditError) {
      return jsonError(error.code === "INSUFFICIENT_LIGHTS" ? 402 : 400, error.code);
    }
    throw error;
  }
  const transaction = spent.transaction;
  if (transaction.feeCents !== settled.feeCents || transaction.netCents !== settled.netCents) {
    return jsonError(500, "SPLIT_MISMATCH");
  }

  if (!spent.replayed) {
    await audit({
      actorId: user.id,
      action: "LIVE_GIFT",
      entityType: "LedgerTransaction",
      entityId: transaction.id,
      metadata: {
        grossCents: transaction.grossCents,
        feeCents: transaction.feeCents,
        netCents: transaction.netCents,
        liveSessionId: session.id,
        attributedTo: shared.attributedTo,
      },
    });
  }

  if (!spent.replayed) {
  const burst = liveGiftBurst({
    catalogPriceCents: gift.priceCents,
    untrustedClientAmount: raw,
    verifiedRecipientCount: recipients.length,
    transactionId: transaction.id,
    symbol: gift.symbol,
    name: gift.nameSk,
    donorName: parsed.data.anonymous ? "" : user.name,
  });
  await publishRoomEvent(session.roomName, burst);
  }

  return NextResponse.json({
    transactionId: transaction.id,
    grossCents: transaction.grossCents,
    feeCents: transaction.feeCents,
    netCents: transaction.netCents,
    currency: transaction.currency,
    paymentMode: "credits",
    status: transaction.status,
    lightBalance: spent.balance,
    shares: shares.map((share) => ({
      name: recipients.find((recipient) => recipient.creatorId === share.creatorId)?.displayName ?? "",
      netCents: share.netCents,
    })),
  });
}

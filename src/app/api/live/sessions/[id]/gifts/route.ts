import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { getCurrentUser } from "@/server/auth";
import { holdDaysFor, orderedVerified } from "@/server/catalog";
import { db } from "@/server/db";
import { jsonError } from "@/server/http";
import { sharesFromNet, recordDonation } from "@/server/ledger";
import { settleLiveGift } from "@/server/live-gifts";
import { createCharge } from "@/server/payments";
import { clientKey, memoryRateLimiter } from "@/server/ratelimit";
import { giftBody } from "@/server/validators";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED");
  const limit = memoryRateLimiter.consume(clientKey(request, "donate", user.id), 30, 60 * 60 * 1000);
  if (!limit.ok) return jsonError(429, "RATE_LIMITED");

  const raw = await request.json().catch(() => null);
  const parsed = giftBody.safeParse(raw);
  if (!parsed.success) return jsonError(400, "INVALID");

  const { id } = await context.params;
  const session = await db.liveSession.findUnique({
    where: { id },
    include: {
      host: true,
      circle: { include: { participants: { include: { creator: true }, orderBy: { joinedAt: "asc" } } } },
    },
  });
  if (!session || session.status !== "LIVE") return jsonError(404, "NOT_FOUND");

  const gift = await db.gift.findUnique({ where: { slug: parsed.data.giftSlug } });
  if (!gift || gift.priceCents <= 0) return jsonError(404, "UNKNOWN_GIFT");

  const recipients = session.circle
    ? orderedVerified(session.circle.participants)
    : [
        {
          creatorId: session.host.id,
          displayName: session.host.displayName,
          payoutHoldDays: session.host.payoutHoldDays,
          stripeAccountId: session.host.stripeAccountId,
        },
      ];
  if (recipients.length === 0) return jsonError(422, "NO_VERIFIED_PARTICIPANTS");
  if (user.creatorProfile && recipients.some((recipient) => recipient.creatorId === user.creatorProfile?.id)) {
    return jsonError(400, "SELF_GIFT");
  }

  const settled = settleLiveGift({
    catalogPriceCents: gift.priceCents,
    untrustedClientAmount: raw,
    verifiedRecipientCount: recipients.length,
  });
  const charge = await createCharge({
    priceCents: gift.priceCents,
    creatorStripeAccountId: recipients.length === 1 ? recipients[0]?.stripeAccountId : null,
    metadata: { kind: session.circle ? "CIRCLE" : "GIFT", liveSessionId: session.id, giftSlug: gift.slug },
  });
  if (charge.split.feeCents !== settled.feeCents || charge.split.netCents !== settled.netCents) {
    return jsonError(500, "SPLIT_MISMATCH");
  }

  const shares = sharesFromNet(
    recipients.map((recipient) => recipient.creatorId),
    charge.split.netCents,
  );
  const transaction = await recordDonation({
    donorId: user.id,
    priceCents: gift.priceCents,
    charge,
    kind: session.circle ? "CIRCLE" : "GIFT",
    shares,
    circleId: session.circleId,
    giftId: gift.id,
    anonymous: Boolean(parsed.data.anonymous),
    holdDays: holdDaysFor(recipients),
    liveSessionId: session.id,
    note: "live",
  });

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
    },
  });

  return NextResponse.json({
    transactionId: transaction.id,
    grossCents: transaction.grossCents,
    feeCents: transaction.feeCents,
    netCents: transaction.netCents,
    currency: transaction.currency,
    paymentMode: charge.mode,
    status: transaction.status,
    shares: shares.map((share) => ({
      name: recipients.find((recipient) => recipient.creatorId === share.creatorId)?.displayName ?? "",
      netCents: share.netCents,
    })),
  });
}

import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { getCurrentUser } from "@/server/auth";
import { orderedVerified, holdDaysFor } from "@/server/catalog";
import { db } from "@/server/db";
import { jsonError } from "@/server/http";
import { recordDonation, sharesFromNet } from "@/server/ledger";
import { createCharge } from "@/server/payments";
import { clientKey, memoryRateLimiter } from "@/server/ratelimit";
import { giftBody } from "@/server/validators";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED");
  const limit = memoryRateLimiter.consume(clientKey(request, "donate", user.id), 30, 60 * 60 * 1000);
  if (!limit.ok) return jsonError(429, "RATE_LIMITED");

  const { id } = await context.params;
  const parsed = giftBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "INVALID");
  const body = parsed.data;

  const gift = await db.gift.findUnique({ where: { slug: body.giftSlug } });
  if (!gift || gift.priceCents <= 0) return jsonError(404, "UNKNOWN_GIFT");

  const circle = await db.blessingCircle.findUnique({
    where: { id },
    include: { participants: { include: { creator: true } } },
  });
  if (!circle || circle.status !== "OPEN") return jsonError(404, "NOT_FOUND");

  const recipients = orderedVerified(circle.participants);
  if (recipients.length === 0) return jsonError(422, "NO_VERIFIED_PARTICIPANTS");
  if (user.creatorProfile && recipients.some((recipient) => recipient.creatorId === user.creatorProfile?.id)) {
    return jsonError(400, "SELF_GIFT");
  }

  if (body.payItForwardFromId) {
    const prior = await db.ledgerTransaction.findUnique({ where: { id: body.payItForwardFromId } });
    if (!prior) return jsonError(400, "UNKNOWN_CHAIN");
  }

  const charge = await createCharge({
    priceCents: gift.priceCents,
    metadata: { kind: "CIRCLE", circleId: circle.id, giftSlug: gift.slug },
  });
  const shares = sharesFromNet(
    recipients.map((recipient) => recipient.creatorId),
    charge.split.netCents,
  );

  const transaction = await recordDonation({
    donorId: user.id,
    priceCents: gift.priceCents,
    charge,
    kind: "CIRCLE",
    shares,
    circleId: circle.id,
    giftId: gift.id,
    anonymous: Boolean(body.anonymous),
    payItForwardFromId: body.payItForwardFromId ?? null,
    holdDays: holdDaysFor(recipients),
    note: "circle",
  });

  await audit({
    actorId: user.id,
    action: "CIRCLE_DONATION",
    entityType: "LedgerTransaction",
    entityId: transaction.id,
    metadata: {
      grossCents: transaction.grossCents,
      feeCents: transaction.feeCents,
      netCents: transaction.netCents,
      shares: shares.length,
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
    clientSecret: charge.clientSecret,
  });
}

import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { jsonError } from "@/server/http";
import { holdDaysFor } from "@/server/catalog";
import { recordDonation } from "@/server/ledger";
import { createCharge } from "@/server/payments";
import { clientKey, memoryRateLimiter } from "@/server/ratelimit";
import { giftBody } from "@/server/validators";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED");
  const limit = memoryRateLimiter.consume(clientKey(request, "donate", user.id), 30, 60 * 60 * 1000);
  if (!limit.ok) return jsonError(429, "RATE_LIMITED");

  const parsed = giftBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !parsed.data.videoId) return jsonError(400, "INVALID");
  const body = parsed.data;

  const gift = await db.gift.findUnique({ where: { slug: body.giftSlug } });
  if (!gift || gift.priceCents <= 0) return jsonError(404, "UNKNOWN_GIFT");

  const video = await db.video.findUnique({ where: { id: body.videoId }, include: { creator: true } });
  if (!video || video.moderationStatus !== "VISIBLE") return jsonError(404, "NOT_FOUND");
  if (user.creatorProfile?.id === video.creatorId) return jsonError(400, "SELF_GIFT");

  if (body.payItForwardFromId) {
    const prior = await db.ledgerTransaction.findUnique({ where: { id: body.payItForwardFromId } });
    if (!prior) return jsonError(400, "UNKNOWN_CHAIN");
  }

  const charge = await createCharge({
    priceCents: gift.priceCents,
    creatorStripeAccountId: video.creator.stripeAccountId,
    metadata: { kind: "GIFT", creatorId: video.creatorId, giftSlug: gift.slug, videoId: video.id },
  });

  const transaction = await recordDonation({
    donorId: user.id,
    priceCents: gift.priceCents,
    charge,
    kind: "GIFT",
    shares: [{ creatorId: video.creatorId, netCents: charge.split.netCents }],
    videoId: video.id,
    giftId: gift.id,
    anonymous: Boolean(body.anonymous),
    payItForwardFromId: body.payItForwardFromId ?? null,
    holdDays: holdDaysFor([video.creator]),
  });

  await audit({
    actorId: user.id,
    action: "DONATION",
    entityType: "LedgerTransaction",
    entityId: transaction.id,
    metadata: {
      grossCents: transaction.grossCents,
      feeCents: transaction.feeCents,
      netCents: transaction.netCents,
      mode: charge.mode,
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
    shares: [{ name: video.creator.displayName, netCents: transaction.netCents }],
    clientSecret: charge.clientSecret,
  });
}

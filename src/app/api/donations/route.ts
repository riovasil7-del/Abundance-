import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { jsonError } from "@/server/http";
import { holdDaysFor } from "@/server/catalog";
import { randomUUID } from "node:crypto";
import { CreditError, spendLights } from "@/server/credits";
import { splitDonation } from "@/server/fees";
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

  let spent;
  try {
    spent = await spendLights({
      donorId: user.id,
      priceCents: gift.priceCents,
      token: body.token ?? randomUUID(),
      kind: "GIFT",
      shares: [{ creatorId: video.creatorId, netCents: splitDonation(gift.priceCents).netCents }],
      videoId: video.id,
      giftId: gift.id,
      anonymous: Boolean(body.anonymous),
      payItForwardFromId: body.payItForwardFromId ?? null,
      holdDays: holdDaysFor([video.creator]),
    });
  } catch (error) {
    if (error instanceof CreditError) {
      return jsonError(error.code === "INSUFFICIENT_LIGHTS" ? 402 : 400, error.code);
    }
    throw error;
  }
  const transaction = spent.transaction;

  if (!spent.replayed) {
    await audit({
      actorId: user.id,
      action: "DONATION",
      entityType: "LedgerTransaction",
      entityId: transaction.id,
      metadata: {
        grossCents: transaction.grossCents,
        feeCents: transaction.feeCents,
        netCents: transaction.netCents,
        mode: "credits",
      },
    });
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
    shares: [{ name: video.creator.displayName, netCents: transaction.netCents }],
  });
}

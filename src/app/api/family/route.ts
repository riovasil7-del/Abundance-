import { NextResponse } from "next/server";
import { FAMILY_TIERS_CENTS } from "@/config/app";
import { audit } from "@/server/audit";
import { getCurrentUser } from "@/server/auth";
import { holdDaysFor } from "@/server/catalog";
import { db } from "@/server/db";
import { jsonError } from "@/server/http";
import { recordDonation } from "@/server/ledger";
import { financialDenial } from "@/server/money";
import { createCharge } from "@/server/payments";
import { clientKey, memoryRateLimiter } from "@/server/ratelimit";
import { familyBody } from "@/server/validators";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || financialDenial(user)) return jsonError(401, "UNAUTHENTICATED");
  const limit = memoryRateLimiter.consume(clientKey(request, "family", user.id), 10, 60 * 60 * 1000);
  if (!limit.ok) return jsonError(429, "RATE_LIMITED");
  const parsed = familyBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "INVALID");
  const tier = parsed.data.tierCents;
  if (!(FAMILY_TIERS_CENTS as readonly number[]).includes(tier)) return jsonError(400, "INVALID");

  const creator = await db.creatorProfile.findUnique({ where: { id: parsed.data.creatorId } });
  if (!creator) return jsonError(404, "NOT_FOUND");
  if (user.creatorProfile?.id === creator.id) return jsonError(400, "SELF_GIFT");

  const existing = await db.familyMembership.findUnique({
    where: { supporterId_creatorId: { supporterId: user.id, creatorId: creator.id } },
  });
  if (existing && existing.status === "ACTIVE") return jsonError(409, "ALREADY_FAMILY");

  const charge = await createCharge({
    priceCents: tier,
    creatorStripeAccountId: creator.stripeAccountId,
    metadata: { kind: "FAMILY", creatorId: creator.id },
  });

  const membership = existing
    ? await db.familyMembership.update({
        where: { id: existing.id },
        data: {
          status: "ACTIVE",
          monthlyCents: tier,
          anonymous: Boolean(parsed.data.anonymous),
          nextChargeAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })
    : await db.familyMembership.create({
        data: {
          supporterId: user.id,
          creatorId: creator.id,
          monthlyCents: tier,
          anonymous: Boolean(parsed.data.anonymous),
          nextChargeAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

  const transaction = await recordDonation({
    donorId: user.id,
    priceCents: tier,
    charge,
    kind: "FAMILY",
    shares: [{ creatorId: creator.id, netCents: charge.split.netCents }],
    anonymous: Boolean(parsed.data.anonymous),
    familyMembershipId: membership.id,
    holdDays: holdDaysFor([creator]),
    note: "family-first-month",
  });

  await audit({
    actorId: user.id,
    action: "FAMILY_JOIN",
    entityType: "FamilyMembership",
    entityId: membership.id,
    metadata: { monthlyCents: tier, netCents: transaction.netCents, feeCents: transaction.feeCents },
  });

  return NextResponse.json({
    transactionId: transaction.id,
    grossCents: transaction.grossCents,
    feeCents: transaction.feeCents,
    netCents: transaction.netCents,
    currency: transaction.currency,
    paymentMode: charge.mode,
    status: transaction.status,
    shares: [{ name: creator.displayName, netCents: transaction.netCents }],
  });
}

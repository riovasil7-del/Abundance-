import { NextResponse } from "next/server";
import { LEDGER_CURRENCY } from "@/config/app";
import { audit } from "@/server/audit";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { jsonError } from "@/server/http";
import { allocationBucket } from "@/server/ledger";
import { getPayoutProvider, type PayoutProviderId } from "@/server/payouts";
import { clientKey, memoryRateLimiter } from "@/server/ratelimit";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.creatorProfile) return jsonError(403, "CREATOR_ONLY");
  const limit = memoryRateLimiter.consume(clientKey(request, "payout", user.id), 3, 60 * 60 * 1000);
  if (!limit.ok) return jsonError(429, "RATE_LIMITED");

  const allocations = await db.ledgerAllocation.findMany({
    where: { creatorId: user.creatorProfile.id },
    include: { transaction: true },
  });
  const availableCents = allocations.reduce((sum, allocation) => {
    const bucket = allocationBucket(allocation.transaction.status, allocation.transaction.holdUntil);
    return bucket === "available" ? sum + allocation.netCents : sum;
  }, 0);
  if (availableCents <= 0) return jsonError(400, "NOTHING_TO_PAY");

  const providerId = (user.creatorProfile.payoutProvider || "stub") as PayoutProviderId;
  const result = await getPayoutProvider().requestPayout({
    creatorId: user.creatorProfile.id,
    amountCents: availableCents,
    currency: LEDGER_CURRENCY,
    provider: providerId === "stub" ? "mpesa" : providerId,
    destinationRef: user.creatorProfile.payoutDestination,
  });

  const payout = await db.payoutRequest.create({
    data: {
      creatorId: user.creatorProfile.id,
      amountCents: availableCents,
      currency: LEDGER_CURRENCY,
      provider: result.provider,
      status: "STUBBED",
      reference: result.reference,
    },
  });
  await audit({
    actorId: user.id,
    action: "PAYOUT_REQUEST",
    entityType: "PayoutRequest",
    entityId: payout.id,
    metadata: { amountCents: availableCents, provider: result.provider, status: "STUBBED" },
  });
  return NextResponse.json({
    status: "STUBBED",
    amountCents: availableCents,
    reference: result.reference,
    provider: result.provider,
  });
}

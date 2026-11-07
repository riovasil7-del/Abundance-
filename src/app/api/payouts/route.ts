import { NextResponse } from "next/server";
import { LEDGER_CURRENCY } from "@/config/app";
import { audit } from "@/server/audit";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { jsonError } from "@/server/http";
import { payoutDecision } from "@/server/money";
import { creatorMoney } from "@/server/wallet";
import { getPayoutProvider, type PayoutProviderId } from "@/server/payouts";
import { consumeDurableLimit } from "@/server/ratelimit";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.creatorProfile) return jsonError(403, "CREATOR_ONLY");
  const limit = await consumeDurableLimit("payout", user.id, 3, 60 * 60 * 1000);
  if (!limit.ok) return jsonError(429, "RATE_LIMITED");

  const money = await creatorMoney(user.creatorProfile.id);
  const decision = payoutDecision({
    staffVerified: user.creatorProfile.verificationStatus === "VERIFIED",
    realAvailable: money.realAvailable,
    sandboxAvailable: money.sandboxAvailable,
    reserved: money.reserved,
  });
  if (decision.payable <= 0) return jsonError(400, decision.reason);

  const providerId = (user.creatorProfile.payoutProvider || "stub") as PayoutProviderId;
  const result = await getPayoutProvider().requestPayout({
    creatorId: user.creatorProfile.id,
    amountCents: decision.payable,
    currency: LEDGER_CURRENCY,
    provider: providerId === "stub" ? "mpesa" : providerId,
    destinationRef: user.creatorProfile.payoutDestination,
  });

  const payout = await db.payoutRequest.create({
    data: {
      creatorId: user.creatorProfile.id,
      amountCents: decision.payable,
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
    metadata: { amountCents: decision.payable, provider: result.provider, status: "STUBBED", realMoney: false },
  });
  return NextResponse.json({
    status: "STUBBED",
    realMoney: false,
    amountCents: decision.payable,
    reference: result.reference,
    provider: result.provider,
  });
}

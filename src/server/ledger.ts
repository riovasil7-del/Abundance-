import { Prisma, type DonationKind, type PaymentMode, type PrismaClient } from "@prisma/client";
import { LEDGER_CURRENCY } from "../config/app";
import { db } from "./db";
import { allocateEvenly, splitDonation, type MoneySplit } from "./fees";
import type { ChargeDraft } from "./payments";

export type RecipientShare = {
  creatorId: string;
  netCents: number;
};

function assertSplitMatchesPrice(priceCents: number, split: MoneySplit): MoneySplit {
  const again = splitDonation(priceCents);
  if (
    again.grossCents !== split.grossCents ||
    again.feeCents !== split.feeCents ||
    again.netCents !== split.netCents
  ) {
    throw new Error("SPLIT_MISMATCH");
  }
  if (again.feeCents + again.netCents !== again.grossCents) {
    throw new Error("LEDGER_IMBALANCE");
  }
  return again;
}

function holdUntil(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export async function recordDonation(input: {
  donorId: string;
  priceCents: number;
  charge: ChargeDraft;
  kind: DonationKind;
  shares: RecipientShare[];
  videoId?: string | null;
  circleId?: string | null;
  giftId?: string | null;
  anonymous: boolean;
  payItForwardFromId?: string | null;
  familyMembershipId?: string | null;
  holdDays: number;
  note?: string;
  liveSessionId?: string | null;
  sandbox?: boolean;
}, writer: Prisma.TransactionClient | PrismaClient = db): Promise<Prisma.LedgerTransactionGetPayload<{ include: { allocations: true } }>> {
  const split = assertSplitMatchesPrice(input.priceCents, input.charge.split);
  const allocated = input.shares.reduce((sum, share) => sum + share.netCents, 0);
  if (allocated !== split.netCents) throw new Error("ALLOCATION_IMBALANCE");
  if (input.shares.length === 0) throw new Error("NO_RECIPIENTS");
  if (input.shares.some((share) => !Number.isInteger(share.netCents) || share.netCents < 0)) {
    throw new Error("BAD_SHARE");
  }

  let status: "PENDING" | "HELD" = input.charge.mode === "stripe" ? "PENDING" : "HELD";
  if (input.charge.mode === "stripe" && input.charge.stripePaymentIntentId) {
    const marker = await writer.paymentMarker.findUnique({
      where: { key: `settle:${input.charge.stripePaymentIntentId}` },
    });
    if (marker?.kind === "DEFERRED_SETTLE") status = "HELD";
  }
  const paymentMode: PaymentMode =
    input.charge.mode === "stripe" ? "STRIPE" : input.charge.mode === "credits" ? "CREDITS" : "DEMO";

  const transaction = await writer.ledgerTransaction.create({
    data: {
      donorId: input.donorId,
      kind: input.kind,
      videoId: input.videoId ?? null,
      circleId: input.circleId ?? null,
      giftId: input.giftId ?? null,
      grossCents: split.grossCents,
      feeCents: split.feeCents,
      netCents: split.netCents,
      currency: LEDGER_CURRENCY,
      status,
      paymentMode,
      stripePaymentIntentId: input.charge.stripePaymentIntentId,
      anonymous: input.anonymous,
      payItForwardFromId: input.payItForwardFromId ?? null,
      familyMembershipId: input.familyMembershipId ?? null,
      holdUntil: holdUntil(input.holdDays),
      note: input.note,
      sandbox: input.sandbox ?? input.charge.mode === "demo",
      liveSessionId: input.liveSessionId ?? null,
      allocations: {
        create: input.shares.map((share) => ({
          creatorId: share.creatorId,
          netCents: share.netCents,
        })),
      },
    },
    include: { allocations: true },
  });
  await writer.moneyEvent.create({
    data: {
      transactionId: transaction.id,
      kind: status === "HELD" && input.charge.mode === "stripe" ? "DONATION_SETTLED" : "DONATION_RECORDED",
      grossCents: split.grossCents,
      feeCents: split.feeCents,
      netCents: split.netCents,
      note: input.charge.mode === "credits" ? "lights" : input.charge.mode,
    },
  });
  return transaction;
}

export function sharesFromNet(creatorIdsInOrder: string[], netCents: number): RecipientShare[] {
  const amounts = allocateEvenly(netCents, creatorIdsInOrder.length);
  return creatorIdsInOrder.map((creatorId, index) => ({
    creatorId,
    netCents: amounts[index]!,
  }));
}

export type WalletBucket = "pending" | "available";

export function allocationBucket(
  status: string,
  holdUntilDate: Date | null,
  now = new Date(),
): WalletBucket | null {
  if (status === "FAILED" || status === "REFUNDED" || status === "PENDING" || status === "PAID_OUT" || status === "FROZEN") {
    return null;
  }
  if (status !== "HELD" && status !== "AVAILABLE") return null;
  if (holdUntilDate && holdUntilDate.getTime() > now.getTime()) return "pending";
  return "available";
}

export type EarningBucket = "pending" | "available" | "frozen" | "paid";

/** Earned creator cents, kept distinct. Stripe that has not settled is not earned. */
export function earningBucket(
  status: string,
  holdUntilDate: Date | null,
  now = new Date(),
): EarningBucket | null {
  if (status === "PAID_OUT") return "paid";
  if (status === "FROZEN") return "frozen";
  if (status !== "HELD" && status !== "AVAILABLE") return null;
  if (holdUntilDate && holdUntilDate.getTime() > now.getTime()) return "pending";
  return "available";
}

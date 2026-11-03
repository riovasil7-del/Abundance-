import type { DonationKind, PaymentMode, Prisma } from "@prisma/client";
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
}): Promise<Prisma.LedgerTransactionGetPayload<{ include: { allocations: true } }>> {
  const split = assertSplitMatchesPrice(input.priceCents, input.charge.split);
  const allocated = input.shares.reduce((sum, share) => sum + share.netCents, 0);
  if (allocated !== split.netCents) throw new Error("ALLOCATION_IMBALANCE");
  if (input.shares.length === 0) throw new Error("NO_RECIPIENTS");
  if (input.shares.some((share) => !Number.isInteger(share.netCents) || share.netCents < 0)) {
    throw new Error("BAD_SHARE");
  }

  const status = input.charge.mode === "stripe" ? "PENDING" : "HELD";
  const paymentMode: PaymentMode = input.charge.mode === "stripe" ? "STRIPE" : "DEMO";

  return db.ledgerTransaction.create({
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
      allocations: {
        create: input.shares.map((share) => ({
          creatorId: share.creatorId,
          netCents: share.netCents,
        })),
      },
    },
    include: { allocations: true },
  });
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
  if (status === "FAILED" || status === "REFUNDED" || status === "PENDING" || status === "PAID_OUT") {
    return null;
  }
  if (status !== "HELD" && status !== "AVAILABLE") return null;
  if (holdUntilDate && holdUntilDate.getTime() > now.getTime()) return "pending";
  return "available";
}

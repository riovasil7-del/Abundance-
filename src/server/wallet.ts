import type { Locale } from "../config/app";
import { formatWhen, pickLocalized } from "../lib/format";
import { messagesFor } from "../i18n";
import { db } from "./db";
import { earningBucket } from "./ledger";

export type WalletLine = {
  id: string;
  title: string;
  detail: string;
  grossCents: number;
  feeCents: number;
  netCents: number;
  shareCents: number;
  direct: boolean;
  bucket: "available" | "pending" | "other";
  holdLabel: string | null;
};

export type WalletSnapshot = {
  mode: "creator" | "supporter";
  earnedCents: number;
  availableCents: number;
  pendingCents: number;
  frozenCents: number;
  paidCents: number;
  reviewCents: number;
  reservedCents: number;
  demoEarningsCents: number;
  lines: WalletLine[];
};

function classify(status: string, holdUntil: Date | null): WalletLine["bucket"] {
  const earned = earningBucket(status, holdUntil);
  if (earned === "pending" || earned === "available") return earned;
  return "other";
}

export async function loadWallet(input: {
  userId: string;
  userName: string;
  creatorId: string | null;
  locale: Locale;
}): Promise<WalletSnapshot> {
  const messages = messagesFor(input.locale);

  if (input.creatorId) {
    const allocations = await db.ledgerAllocation.findMany({
      where: { creatorId: input.creatorId },
      orderBy: { createdAt: "desc" },
      include: {
        transaction: {
          include: { gift: true, donor: { select: { name: true } }, circle: true },
        },
      },
    });
    const lines: WalletLine[] = allocations.map((allocation) => {
      const transaction = allocation.transaction;
      const bucket = classify(transaction.status, transaction.holdUntil);
      const giftName = transaction.gift
        ? (messages.giftNames[transaction.gift.slug as keyof typeof messages.giftNames] ?? transaction.gift.nameEn)
        : transaction.kind === "FAMILY"
          ? messages.wallet.family
          : messages.wallet.circle;
      const who = transaction.anonymous ? messages.common.anonymous : transaction.donor.name;
      const circleTitle = transaction.circle
        ? pickLocalized(input.locale, transaction.circle.title, transaction.circle.titleEn)
        : null;
      return {
        id: allocation.id,
        title: giftName,
        detail: circleTitle ? `${messages.wallet.circle}: ${circleTitle}` : who,
        grossCents: transaction.grossCents,
        feeCents: transaction.feeCents,
        netCents: transaction.netCents,
        shareCents: allocation.netCents,
        direct: allocation.netCents === transaction.netCents,
        bucket,
        holdLabel:
          bucket === "pending" && transaction.holdUntil
            ? `${messages.wallet.hold} ${formatWhen(transaction.holdUntil, input.locale)}`
            : bucket === "available"
              ? messages.wallet.ready
              : null,
      };
    });
    const money = await creatorMoney(input.creatorId);
    const review = await openReviewCents(input.userId);
    return {
      mode: "creator",
      earnedCents: money.earned,
      pendingCents: money.pending,
      availableCents: money.payable,
      frozenCents: money.frozen,
      paidCents: money.paid,
      reservedCents: money.reserved,
      demoEarningsCents: money.sandboxAvailable,
      reviewCents: review,
      lines,
    };
  }

  const donations = await db.ledgerTransaction.findMany({
    where: { donorId: input.userId },
    orderBy: { createdAt: "desc" },
    include: { gift: true, allocations: { include: { creator: true } }, circle: true },
  });
  const lines: WalletLine[] = donations.map((transaction) => {
    const giftName = transaction.gift
      ? (messages.giftNames[transaction.gift.slug as keyof typeof messages.giftNames] ?? transaction.gift.nameEn)
      : messages.wallet.family;
    const names = transaction.allocations.map((allocation) => allocation.creator.displayName).join(", ");
    const circleTitle = transaction.circle
      ? pickLocalized(input.locale, transaction.circle.title, transaction.circle.titleEn)
      : null;
    return {
      id: transaction.id,
      title: giftName,
      detail: circleTitle ? `${messages.wallet.circle}: ${circleTitle}` : names,
      grossCents: transaction.grossCents,
      feeCents: transaction.feeCents,
      netCents: transaction.netCents,
      shareCents: transaction.netCents,
      direct: transaction.kind !== "CIRCLE",
      bucket: classify(transaction.status, transaction.holdUntil),
      holdLabel: null,
    };
  });
  return {
    mode: "supporter",
    earnedCents: 0,
    availableCents: 0,
    pendingCents: 0,
    frozenCents: 0,
    paidCents: 0,
    reviewCents: await openReviewCents(input.userId),
    reservedCents: 0,
    demoEarningsCents: 0,
    lines,
  };
}

export async function creatorMoney(creatorId: string) {
  const allocations = await db.ledgerAllocation.findMany({
    where: { creatorId },
    include: { transaction: true },
  });
  let realAvailable = 0;
  let sandboxAvailable = 0;
  let pending = 0;
  let frozen = 0;
  let paid = 0;
  let earned = 0;
  for (const allocation of allocations) {
    const bucket = earningBucket(allocation.transaction.status, allocation.transaction.holdUntil);
    if (!bucket) continue;
    const demo = allocation.transaction.sandbox || allocation.transaction.paymentMode === "DEMO";
    if (demo) {
      if (bucket === "available" || bucket === "pending") sandboxAvailable += allocation.netCents;
      continue;
    }
    earned += allocation.netCents;
    if (bucket === "pending") pending += allocation.netCents;
    if (bucket === "available") realAvailable += allocation.netCents;
    if (bucket === "frozen") frozen += allocation.netCents;
    if (bucket === "paid") paid += allocation.netCents;
  }
  const reservedRow = await db.payoutReservation.aggregate({
    where: { creatorId, status: "ACTIVE" },
    _sum: { amountCents: true },
  });
  const reserved = reservedRow._sum.amountCents ?? 0;
  return {
    realAvailable,
    sandboxAvailable,
    pending,
    frozen,
    paid,
    earned,
    reserved,
    payable: Math.max(0, realAvailable - reserved),
  };
}

function totalsFrom(rows: { status: string; holdUntil: Date | null; netCents: number }[]) {
  const totals = { earnedCents: 0, pendingCents: 0, availableCents: 0, frozenCents: 0, paidCents: 0 };
  for (const row of rows) {
    const bucket = earningBucket(row.status, row.holdUntil);
    if (!bucket) continue;
    totals.earnedCents += row.netCents;
    if (bucket === "pending") totals.pendingCents += row.netCents;
    if (bucket === "available") totals.availableCents += row.netCents;
    if (bucket === "frozen") totals.frozenCents += row.netCents;
    if (bucket === "paid") totals.paidCents += row.netCents;
  }
  return totals;
}

async function openReviewCents(userId: string): Promise<number> {
  const sum = await db.accountReview.aggregate({
    where: { userId, status: "OPEN", reviewCents: { gt: 0 } },
    _sum: { reviewCents: true },
  });
  return sum._sum.reviewCents ?? 0;
}

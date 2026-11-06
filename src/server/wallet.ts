import type { Locale } from "../config/app";
import { formatWhen, pickLocalized } from "../lib/format";
import { messagesFor } from "../i18n";
import { db } from "./db";
import { allocationBucket } from "./ledger";

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
  availableCents: number;
  pendingCents: number;
  lines: WalletLine[];
};

function classify(status: string, holdUntil: Date | null): WalletLine["bucket"] {
  return allocationBucket(status, holdUntil) ?? "other";
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
    return {
      mode: "creator",
      availableCents: lines.reduce((sum, line) => (line.bucket === "available" ? sum + line.shareCents : sum), 0),
      pendingCents: lines.reduce((sum, line) => (line.bucket === "pending" ? sum + line.shareCents : sum), 0),
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
  return { mode: "supporter", availableCents: 0, pendingCents: 0, lines };
}

import type { Locale } from "../config/app";
import { messagesFor } from "../i18n";
import type { GiftChoice } from "../lib/types";
import { db } from "./db";
import { splitDonation } from "./fees";

export async function loadGiftChoices(locale: Locale): Promise<GiftChoice[]> {
  const gifts = await db.gift.findMany({ orderBy: { sortOrder: "asc" } });
  const names = messagesFor(locale).giftNames;
  return gifts.map((gift) => {
    const split = splitDonation(gift.priceCents);
    const named = names[gift.slug as keyof typeof names];
    return {
      slug: gift.slug,
      name: named ?? (locale === "sk" ? gift.nameSk : gift.nameEn),
      symbol: gift.symbol,
      priceCents: split.grossCents,
      feeCents: split.feeCents,
      netCents: split.netCents,
    };
  });
}

export type VerifiedRecipient = {
  creatorId: string;
  displayName: string;
  payoutHoldDays: number;
  stripeAccountId: string | null;
  joinedAt: Date;
};

export function orderedVerified(
  participants: {
    creatorId: string;
    joinedAt: Date;
    creator: {
      displayName: string;
      verificationStatus: string;
      payoutHoldDays: number;
      stripeAccountId: string | null;
    };
  }[],
): VerifiedRecipient[] {
  return participants
    .filter((participant) => participant.creator.verificationStatus === "VERIFIED")
    .map((participant) => ({
      creatorId: participant.creatorId,
      displayName: participant.creator.displayName,
      payoutHoldDays: participant.creator.payoutHoldDays,
      stripeAccountId: participant.creator.stripeAccountId,
      joinedAt: participant.joinedAt,
    }))
    .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime() || a.creatorId.localeCompare(b.creatorId));
}

export function holdDaysFor(recipients: { payoutHoldDays: number }[]): number {
  const days = recipients.map((recipient) => recipient.payoutHoldDays);
  return Math.max(0, ...days, 0);
}

import type { Locale } from "../config/app";
import type { GiftChoice } from "../lib/types";
import { db } from "./db";
import { splitDonation } from "./fees";

export async function loadGiftChoices(locale: Locale): Promise<GiftChoice[]> {
  const gifts = await db.gift.findMany({ orderBy: { sortOrder: "asc" } });
  return gifts.map((gift) => {
    const split = splitDonation(gift.priceCents);
    return {
      slug: gift.slug,
      name: locale === "en" ? gift.nameEn : gift.nameSk,
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

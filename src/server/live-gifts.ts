import { splitCircleDonation, splitDonation, type MoneySplit } from "./fees";

/**
 * A live gift uses the same split as every other donation.
 * One verified recipient keeps the whole 80%. A live blessing circle
 * shares that 80% evenly. The client amount is accepted only so tests
 * can prove it does not change the result.
 */
export function settleLiveGift(input: {
  catalogPriceCents: number;
  untrustedClientAmount?: unknown;
  verifiedRecipientCount: number;
}): MoneySplit & { shares: number[] } {
  void input.untrustedClientAmount;
  if (!Number.isInteger(input.verifiedRecipientCount) || input.verifiedRecipientCount < 1) {
    throw new Error("NO_VERIFIED_PARTICIPANTS");
  }
  if (input.verifiedRecipientCount === 1) {
    const split = splitDonation(input.catalogPriceCents);
    return { ...split, shares: [split.netCents] };
  }
  return splitCircleDonation(input.catalogPriceCents, input.verifiedRecipientCount);
}

export type LiveGiftBurst = {
  type: "gift";
  transactionId: string;
  symbol: string;
  name: string;
  donorName: string;
  grossCents: number;
  feeCents: number;
  netCents: number;
};

/** The animation everyone sees. Amounts come only from settleLiveGift. */
export function liveGiftBurst(input: {
  catalogPriceCents: number;
  untrustedClientAmount?: unknown;
  verifiedRecipientCount: number;
  transactionId: string;
  symbol: string;
  name: string;
  donorName: string;
}): LiveGiftBurst {
  const settled = settleLiveGift({
    catalogPriceCents: input.catalogPriceCents,
    untrustedClientAmount: input.untrustedClientAmount,
    verifiedRecipientCount: input.verifiedRecipientCount,
  });
  return {
    type: "gift",
    transactionId: input.transactionId,
    symbol: input.symbol,
    name: input.name,
    donorName: input.donorName,
    grossCents: settled.grossCents,
    feeCents: settled.feeCents,
    netCents: settled.netCents,
  };
}

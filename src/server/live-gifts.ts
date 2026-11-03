import { splitCircleDonation, splitDonation, type MoneySplit } from "./fees";

/**
 * A live gift uses the same split as every other donation.
 * One verified recipient keeps the whole 85%. A live blessing circle
 * shares that 85% evenly. The client amount is accepted only so tests
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

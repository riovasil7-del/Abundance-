import { fundOf, type FundCode } from "../lib/gift-tier";
import { splitDonation, type MoneySplit } from "./fees";
import { sharesFromNet, type RecipientShare } from "./ledger";

export type { FundCode };
export { fundOf };

/**
 * One call to splitDonation. A community-fund gift keeps the same fee
 * and writes the whole net to the fund, not to a creator.
 */
export function planGift(
  priceCents: number,
  destination: string,
  creatorIds: readonly string[],
): { split: MoneySplit; shares: RecipientShare[]; fund: FundCode | null } {
  const split = splitDonation(priceCents);
  const fund = fundOf(destination);
  if (fund) {
    return { split, shares: [], fund };
  }
  return { split, shares: sharesFromNet([...creatorIds], split.netCents), fund: null };
}


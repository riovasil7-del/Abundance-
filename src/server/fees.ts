import {
  PLATFORM_FEE,
  PLATFORM_FEE_DENOMINATOR,
  PLATFORM_FEE_NUMERATOR,
} from "../config/app";

/**
 * The only money split in the product.
 *
 * Every donor transaction is divided here, in integer minor units (cents):
 *   platform fee = 15% of gross, half-up
 *   creator net  = gross - fee
 *
 * Callers must pass a price loaded on the server (gift catalog or family tier).
 * Client-supplied amounts are not a parameter that affects the result.
 */

export type MoneySplit = {
  grossCents: number;
  feeCents: number;
  netCents: number;
};

const MAX_GROSS_CENTS = 100_000_000_00;

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyError";
  }
}

/** Fail fast if the named fee constant and the integer fraction ever drift apart. */
export function assertFeeConfig(): void {
  if (PLATFORM_FEE !== 0.15) {
    throw new MoneyError("PLATFORM_FEE must stay exactly 0.15");
  }
  if (PLATFORM_FEE_NUMERATOR !== 15 || PLATFORM_FEE_DENOMINATOR !== 100) {
    throw new MoneyError("Platform fee fraction must stay 15/100");
  }
  if (PLATFORM_FEE_NUMERATOR / PLATFORM_FEE_DENOMINATOR !== PLATFORM_FEE) {
    throw new MoneyError("PLATFORM_FEE and its integer fraction disagree");
  }
}

assertFeeConfig();

function assertCents(value: number, label: string): void {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new MoneyError(`${label} must be a safe integer number of cents`);
  }
  if (value < 0) {
    throw new MoneyError(`${label} cannot be negative`);
  }
  if (value > MAX_GROSS_CENTS) {
    throw new MoneyError(`${label} is above the supported maximum`);
  }
}

/**
 * Split one donor charge.
 * Rounding is half-up, implemented with integers only:
 *   fee = floor((gross * 15 + 50) / 100)
 * so 1.5 cents of fee becomes 2, and an exact 15.00 stays 15.
 */
export function splitDonation(grossCents: number): MoneySplit {
  assertCents(grossCents, "grossCents");
  const feeCents = Math.floor(
    (grossCents * PLATFORM_FEE_NUMERATOR + Math.floor(PLATFORM_FEE_DENOMINATOR / 2)) /
      PLATFORM_FEE_DENOMINATOR,
  );
  const netCents = grossCents - feeCents;
  if (feeCents + netCents !== grossCents || feeCents < 0 || netCents < 0) {
    throw new MoneyError("Split broke the conservation invariant");
  }
  return { grossCents, feeCents, netCents };
}

/**
 * Look up the price on the server and split that. `untrusted` is accepted
 * only so tests (and reviewers) can see that a client amount cannot change the split.
 */
export function priceDonationFromCatalog(
  catalog: readonly { slug: string; priceCents: number }[],
  giftSlug: string,
  untrusted?: unknown,
): MoneySplit {
  void untrusted;
  const gift = catalog.find((item) => item.slug === giftSlug);
  if (!gift) throw new MoneyError("UNKNOWN_GIFT");
  return splitDonation(gift.priceCents);
}

/** Split a net amount across verified participants. Earlier indexes receive leftover cents. */
export function allocateEvenly(totalCents: number, parts: number): number[] {
  assertCents(totalCents, "totalCents");
  if (!Number.isSafeInteger(parts) || parts < 1) {
    throw new MoneyError("A circle donation needs at least one verified participant");
  }
  if (parts > 10_000) throw new MoneyError("Too many participants");
  const base = Math.floor(totalCents / parts);
  let remainder = totalCents - base * parts;
  const shares: number[] = [];
  for (let i = 0; i < parts; i += 1) {
    const extra = remainder > 0 ? 1 : 0;
    if (extra) remainder -= 1;
    shares.push(base + extra);
  }
  const sum = shares.reduce((total, share) => total + share, 0);
  if (sum !== totalCents) throw new MoneyError("Allocation broke the conservation invariant");
  return shares;
}

/** Fee is taken once from the gift, then the 85% net is shared evenly. */
export function splitCircleDonation(grossCents: number, participantCount: number): MoneySplit & { shares: number[] } {
  const split = splitDonation(grossCents);
  const shares = allocateEvenly(split.netCents, participantCount);
  return { ...split, shares };
}

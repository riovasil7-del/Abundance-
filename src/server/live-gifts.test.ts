import assert from "node:assert/strict";
import test from "node:test";
import { GIFT_CATALOG } from "../config/app";
import { splitDonation } from "./fees";
import { settleLiveGift } from "./live-gifts";

test("a live gift uses the same 15/85 split as every other donation", () => {
  const candle = GIFT_CATALOG.find((gift) => gift.slug === "candle");
  assert.ok(candle);
  const settled = settleLiveGift({
    catalogPriceCents: candle.priceCents,
    untrustedClientAmount: { amount: 1, priceCents: 999999 },
    verifiedRecipientCount: 1,
  });
  assert.deepEqual(settled, { ...splitDonation(candle.priceCents), shares: [85] });
  assert.equal(settled.grossCents, 100);
  assert.equal(settled.feeCents, 15);
  assert.equal(settled.netCents, 85);
  assert.equal(settled.feeCents + settled.netCents, settled.grossCents);
});

test("a live blessing circle shares the 85 percent evenly after one fee", () => {
  const settled = settleLiveGift({
    catalogPriceCents: 100,
    untrustedClientAmount: 7,
    verifiedRecipientCount: 3,
  });
  assert.equal(settled.feeCents, 15);
  assert.equal(settled.netCents, 85);
  assert.deepEqual(settled.shares, [29, 28, 28]);
  assert.equal(
    settled.shares.reduce((sum, share) => sum + share, 0),
    settled.netCents,
  );
});

test("a live gift with nobody verified is refused", () => {
  assert.throws(() => settleLiveGift({ catalogPriceCents: 100, verifiedRecipientCount: 0 }), /NO_VERIFIED_PARTICIPANTS/);
});

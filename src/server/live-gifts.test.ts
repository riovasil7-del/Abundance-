import assert from "node:assert/strict";
import test from "node:test";
import { GIFT_CATALOG } from "../config/app";
import { splitDonation } from "./fees";
import { liveGiftBurst, settleLiveGift } from "./live-gifts";

test("a live gift uses the same 20/80 split as every other donation", () => {
  const candle = GIFT_CATALOG.find((gift) => gift.slug === "candle");
  assert.ok(candle);
  const settled = settleLiveGift({
    catalogPriceCents: candle.priceCents,
    untrustedClientAmount: { amount: 1, priceCents: 999999 },
    verifiedRecipientCount: 1,
  });
  assert.deepEqual(settled, { ...splitDonation(candle.priceCents), shares: [splitDonation(candle.priceCents).netCents] });
  assert.equal(settled.grossCents, candle.priceCents);
  assert.equal(settled.feeCents + settled.netCents, settled.grossCents);
  assert.equal(settled.feeCents + settled.netCents, settled.grossCents);
});

test("a live blessing circle shares the 80 percent evenly after one fee", () => {
  const settled = settleLiveGift({
    catalogPriceCents: 100,
    untrustedClientAmount: 7,
    verifiedRecipientCount: 3,
  });
  assert.equal(settled.feeCents, 20);
  assert.equal(settled.netCents, 80);
  assert.deepEqual(settled.shares, [27, 27, 26]);
  assert.equal(
    settled.shares.reduce((sum, share) => sum + share, 0),
    settled.netCents,
  );
});

test("the gift burst everyone sees uses the server split, not a client amount", () => {
  const burst = liveGiftBurst({
    catalogPriceCents: 1000,
    untrustedClientAmount: { amount: 1, grossCents: 5 },
    verifiedRecipientCount: 1,
    transactionId: "tx_1",
    symbol: "💛",
    name: "Srdce",
    donorName: "Elena",
  });
  assert.equal(burst.type, "gift");
  assert.equal(burst.grossCents, 1000);
  assert.equal(burst.feeCents, 200);
  assert.equal(burst.netCents, 800);
  assert.equal(burst.donorName, "Elena");
  assert.notEqual(burst.grossCents, 1);
  assert.notEqual(burst.grossCents, 5);
});

test("a live gift with nobody verified is refused", () => {
  assert.throws(() => settleLiveGift({ catalogPriceCents: 100, verifiedRecipientCount: 0 }), /NO_VERIFIED_PARTICIPANTS/);
});

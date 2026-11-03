import assert from "node:assert/strict";
import test from "node:test";
import { GIFT_CATALOG, PLATFORM_FEE } from "../config/app";
import {
  allocateEvenly,
  priceDonationFromCatalog,
  splitCircleDonation,
  splitDonation,
} from "./fees";

test("PLATFORM_FEE is exactly 15 percent", () => {
  assert.equal(PLATFORM_FEE, 0.15);
});

test("one dollar splits into 15 cents fee and 85 cents net", () => {
  assert.deepEqual(splitDonation(100), { grossCents: 100, feeCents: 15, netCents: 85 });
});

test("catalog prices that divide cleanly keep an exact 15/85 split", () => {
  for (const gift of GIFT_CATALOG) {
    const split = splitDonation(gift.priceCents);
    assert.equal(split.feeCents, (gift.priceCents * 15) / 100);
    assert.equal(split.netCents, gift.priceCents - split.feeCents);
    assert.equal(split.feeCents + split.netCents, gift.priceCents);
  }
});

test("half-up rounding edges stay inside a single cent", () => {
  // 1 cent * 15% = 0.15 -> 0
  assert.deepEqual(splitDonation(1), { grossCents: 1, feeCents: 0, netCents: 1 });
  // 3 * 0.15 = 0.45 -> 0
  assert.equal(splitDonation(3).feeCents, 0);
  // 4 * 0.15 = 0.60 -> 1
  assert.equal(splitDonation(4).feeCents, 1);
  // 10 * 0.15 = 1.5 -> 2 (half up), creator keeps 8
  assert.deepEqual(splitDonation(10), { grossCents: 10, feeCents: 2, netCents: 8 });
  // 7 * 0.15 = 1.05 -> 1
  assert.equal(splitDonation(7).feeCents, 1);
  assert.equal(splitDonation(0).feeCents, 0);
});

test("fee plus net always equals gross, and the fee is within half a cent", () => {
  for (let gross = 0; gross <= 20_000; gross += 1) {
    const split = splitDonation(gross);
    assert.equal(split.feeCents + split.netCents, gross);
    assert.ok(split.feeCents >= 0);
    assert.ok(split.netCents >= 0);
    const exactFee = gross * 0.15;
    assert.ok(
      Math.abs(split.feeCents - exactFee) <= 0.5 + 1e-9,
      `gross ${gross} fee ${split.feeCents} drifted from ${exactFee}`,
    );
  }
});

test("a large exact amount does not drift", () => {
  const gross = 9_999_900;
  const split = splitDonation(gross);
  assert.equal(split.feeCents, 1_499_985);
  assert.equal(split.netCents, 8_499_915);
  assert.equal(split.feeCents + split.netCents, gross);
});

test("rejects amounts the client might forge", () => {
  assert.throws(() => splitDonation(-1), /negative/);
  assert.throws(() => splitDonation(1.5), /integer/);
  assert.throws(() => splitDonation(Number.NaN), /integer/);
  assert.throws(() => splitDonation(Number.POSITIVE_INFINITY), /integer/);
  assert.throws(() => splitDonation(100_000_000_01), /maximum/);
});

test("client-supplied amounts are ignored; the catalog price is split", () => {
  const split = priceDonationFromCatalog(GIFT_CATALOG, "heart", {
    amount: 1,
    priceCents: 5,
    grossCents: 999999,
  });
  assert.deepEqual(split, { grossCents: 1000, feeCents: 150, netCents: 850 });
  assert.throws(() => priceDonationFromCatalog(GIFT_CATALOG, "nope", { amount: 100 }), /UNKNOWN_GIFT/);
});

test("circle net is shared evenly after the single 15 percent fee", () => {
  const result = splitCircleDonation(100, 3);
  assert.equal(result.feeCents, 15);
  assert.equal(result.netCents, 85);
  assert.deepEqual(result.shares, [29, 28, 28]);
  assert.equal(
    result.shares.reduce((sum, share) => sum + share, 0),
    result.netCents,
  );

  const dove = splitCircleDonation(500, 3);
  assert.equal(dove.feeCents, 75);
  assert.equal(dove.netCents, 425);
  assert.deepEqual(dove.shares, [142, 142, 141]);
});

test("even allocation conserves cents and never differs by more than one", () => {
  const shares = allocateEvenly(10, 3);
  assert.deepEqual(shares, [4, 3, 3]);
  assert.equal(allocateEvenly(0, 4).every((share) => share === 0), true);
  assert.deepEqual(allocateEvenly(85, 1), [85]);
  for (const parts of [1, 2, 3, 7, 8]) {
    for (const total of [0, 1, 2, 15, 85, 100, 425]) {
      const rows = allocateEvenly(total, parts);
      assert.equal(rows.reduce((sum, share) => sum + share, 0), total);
      const min = Math.min(...rows);
      const max = Math.max(...rows);
      assert.ok(max - min <= 1);
    }
  }
  assert.throws(() => allocateEvenly(100, 0), /verified participant/);
});

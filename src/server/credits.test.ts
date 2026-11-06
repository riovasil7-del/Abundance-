import assert from "node:assert/strict";
import test from "node:test";
import "./load-env";
import { LIGHT_PACKS } from "../config/app";
import { splitDonation } from "./fees";
import { catalogPriceCents, creditPack, CreditError, lightBalance, spendLights } from "./credits";
import { db } from "./db";

test("packs are a clear one-to-one of dollars and lights", () => {
  assert.equal(LIGHT_PACKS.length, 4);
  for (const pack of LIGHT_PACKS) {
    assert.equal(pack.lights, pack.priceCents);
    assert.ok(pack.priceCents >= 500);
  }
});

test("a gift price never comes from the client", () => {
  assert.equal(catalogPriceCents(100, { priceCents: 1, amount: 999999 }), 100);
  assert.throws(() => catalogPriceCents(1.5), /BAD_PRICE/);
});

test("buying a pack is idempotent, and a gift spends lights at 15/85", { skip: !process.env.DATABASE_URL }, async () => {
  const stamp = Date.now().toString(36);
  const donor = await db.user.create({
    data: { email: `lights-${stamp}@test.local`, passwordHash: "x", name: "Tester" },
  });
  const creatorUser = await db.user.create({
    data: { email: `maker-${stamp}@test.local`, passwordHash: "x", name: "Maker", role: "CREATOR" },
  });
  const creator = await db.creatorProfile.create({
    data: {
      userId: creatorUser.id,
      slug: `maker-${stamp}`,
      displayName: "Maker",
      bio: "A quiet workshop.",
      city: "Nairobi",
      avatarUrl: "/placeholder.svg",
      craftKey: "weaving",
      verificationStatus: "VERIFIED",
    },
  });
  const gift = await db.gift.upsert({
    where: { slug: "candle" },
    update: {},
    create: { slug: "candle", nameSk: "Sviečka", nameEn: "Candle", priceCents: 100, symbol: "x", sortOrder: 1 },
  });

  try {
    const first = await creditPack({ userId: donor.id, packSlug: "small", token: `tok-${stamp}-a` });
    const again = await creditPack({ userId: donor.id, packSlug: "small", token: `tok-${stamp}-a` });
    assert.equal(first.replayed, false);
    assert.equal(again.replayed, true);
    assert.equal(again.balance, 500);
    assert.equal(await lightBalance(donor.id), 500);

    const price = gift.priceCents;
    const split = splitDonation(price);
    const spent = await spendLights({
      donorId: donor.id,
      priceCents: price,
      token: `gift-${stamp}`,
      kind: "GIFT",
      shares: [{ creatorId: creator.id, netCents: split.netCents }],
      giftId: gift.id,
      anonymous: false,
      holdDays: 7,
    });
    assert.equal(spent.replayed, false);
    assert.equal(spent.balance, 500 - price);
    assert.equal(spent.transaction.grossCents, price);
    assert.equal(spent.transaction.feeCents, split.feeCents);
    assert.equal(spent.transaction.netCents, split.netCents);
    assert.equal(spent.transaction.feeCents + spent.transaction.netCents, price);
    assert.equal(spent.transaction.paymentMode, "CREDITS");
    assert.equal(split.feeCents, 15);
    assert.equal(split.netCents, 85);

    const replay = await spendLights({
      donorId: donor.id,
      priceCents: price,
      token: `gift-${stamp}`,
      kind: "GIFT",
      shares: [{ creatorId: creator.id, netCents: split.netCents }],
      giftId: gift.id,
      anonymous: false,
      holdDays: 7,
    });
    assert.equal(replay.replayed, true);
    assert.equal(replay.transaction.id, spent.transaction.id);
    assert.equal(await lightBalance(donor.id), 500 - price);

    await assert.rejects(
      () =>
        spendLights({
          donorId: donor.id,
          priceCents: 10_000,
          token: `too-big-${stamp}`,
          kind: "GIFT",
          shares: [{ creatorId: creator.id, netCents: splitDonation(10_000).netCents }],
          anonymous: false,
          holdDays: 7,
        }),
      (error: unknown) => error instanceof CreditError && error.code === "INSUFFICIENT_LIGHTS",
    );
    assert.equal(await lightBalance(donor.id), 500 - price);
  } finally {
    await db.creditEntry.deleteMany({ where: { userId: donor.id } });
    await db.ledgerAllocation.deleteMany({ where: { creatorId: creator.id } });
    await db.ledgerTransaction.deleteMany({ where: { donorId: donor.id } });
    await db.creatorProfile.delete({ where: { id: creator.id } });
    await db.user.deleteMany({ where: { id: { in: [donor.id, creatorUser.id] } } });
  }
});

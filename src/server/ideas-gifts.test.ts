import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { GIFT_CATALOG, TERMS_VERSION } from "../config/app";
import { IDEA_SEED } from "../config/ideas";
import { filterIdeas, moderateIdeaDecision, proposeDecision } from "../lib/idea-rules";
import { splitDonation } from "./fees";
import { planGift } from "./gift-plan";
import "./load-env";
import { db } from "./db";
import { saveIdea } from "./ideas";
import { matchesContentCategory } from "./feed";
import { recordDonation } from "./ledger";
import { termsDecision } from "./terms";

const PRICES: Record<string, number> = {
  heart: 1,
  smile: 5,
  flower: 10,
  candle: 20,
  cloud: 50,
  feather: 99,
  wing: 199,
  dove: 299,
  olive: 499,
  rainbow: 999,
  harp: 1999,
  star: 2999,
  lamp: 4999,
  grail: 9999,
  choir: 19999,
  gate: 49999,
  loaf: 100,
  well: 500,
};

test("gift prices split once and community gifts leave the creator", () => {
  assert.equal(GIFT_CATALOG.length, Object.keys(PRICES).length);
  const olive = GIFT_CATALOG.find((gift) => gift.slug === "olive");
  assert.equal(olive?.nameSk, "Olivová ratolesť");
  for (const gift of GIFT_CATALOG) {
    assert.equal(gift.priceCents, PRICES[gift.slug]);
    const planned = planGift(gift.priceCents, gift.destination, ["creator-a"]);
    const again = splitDonation(gift.priceCents);
    assert.deepEqual(planned.split, again);
    assert.equal(planned.split.feeCents + planned.split.netCents, gift.priceCents);
    if (gift.destination === "creator") {
      assert.equal(planned.fund, null);
      assert.equal(planned.shares.length, 1);
      assert.equal(planned.shares[0]?.netCents, again.netCents);
    } else {
      assert.equal(planned.fund, gift.destination);
      assert.deepEqual(planned.shares, []);
    }
  }
  assert.equal(GIFT_CATALOG.find((gift) => gift.slug === "well")?.destination, "water");
  assert.equal(GIFT_CATALOG.find((gift) => gift.slug === "loaf")?.destination, "food");
});

test("idea moderation, saved filter, and category chips", () => {
  assert.ok(IDEA_SEED.length >= 60);
  assert.equal(proposeDecision({ userId: null, title: "Hello there", description: "A useful deed for neighbours.", category: "neighbours", minutes: 10 }), "UNAUTHENTICATED");
  assert.equal(proposeDecision({ userId: "u", title: "Hi", description: "short", category: "neighbours", minutes: 10 }), "INVALID");
  assert.equal(moderateIdeaDecision("SUPPORTER", "approved"), "FORBIDDEN");
  assert.equal(moderateIdeaDecision("MODERATOR", "approved"), "OK");
  assert.equal(moderateIdeaDecision("ADMIN", "lost"), "INVALID");
  const ideas = [
    { category: "nature", title: "Tree", titleEn: "Tree", description: "Plant", descriptionEn: "Plant", status: "approved" },
    { category: "family", title: "Supper", titleEn: "Supper", description: "Walk", descriptionEn: "Walk", status: "approved" },
  ];
  assert.equal(filterIdeas(ideas, { category: "nature", query: "plant" }).length, 1);
  assert.equal(filterIdeas(ideas, { category: "family", query: "tree" }).length, 0);
  assert.equal(matchesContentCategory("dance", "dance"), true);
  assert.equal(matchesContentCategory("music", "dance"), false);
  assert.equal(matchesContentCategory(null, null), true);
});

test("terms must be the current version before a creator publishes", () => {
  assert.equal(termsDecision(null), "UNAUTHENTICATED");
  assert.equal(termsDecision({ termsVersion: 0 }), "TERMS_REQUIRED");
  assert.equal(termsDecision({ termsVersion: TERMS_VERSION - 1 }), "TERMS_REQUIRED");
  assert.equal(termsDecision({ termsVersion: TERMS_VERSION }), "OK");
});

test("a community fund gift is credited once and not to a creator", async () => {
  const stamp = randomUUID();
  const donor = await db.user.create({
    data: { email: `donor.${stamp}@example.test`, passwordHash: "x", name: "Donor", role: "SUPPORTER", termsVersion: TERMS_VERSION },
  });
  const planned = planGift(500, "water", ["ignored"]);
  const row = await recordDonation({
    donorId: donor.id,
    priceCents: 500,
    charge: {
      split: planned.split,
      currency: "usd",
      mode: "demo",
      stripePaymentIntentId: null,
      clientSecret: null,
    },
    kind: "GIFT",
    shares: planned.shares,
    fund: planned.fund,
    anonymous: false,
    holdDays: 0,
    note: "fund-test",
  });
  assert.equal(row.allocations.length, 0);
  assert.equal(row.feeCents, planned.split.feeCents);
  assert.equal(row.netCents, planned.split.netCents);
  const credit = await db.fundCredit.findUnique({ where: { transactionId: row.id } });
  assert.equal(credit?.fund, "water");
  assert.equal(credit?.netCents, planned.split.netCents);
  const idea = await db.idea.create({
    data: {
      slug: `test-${stamp}`,
      title: "Test idea",
      description: "A practical deed for the test.",
      category: "quick",
      estimatedMinutes: 5,
      status: "approved",
    },
  });
  assert.equal(await saveIdea(donor.id, idea.id), "SAVED");
  assert.equal(await saveIdea(donor.id, idea.id), "REMOVED");
  await db.ideaSave.deleteMany({ where: { userId: donor.id } });
  await db.fundCredit.deleteMany({ where: { transactionId: row.id } });
  await db.moneyEvent.deleteMany({ where: { transactionId: row.id } });
  await db.ledgerTransaction.delete({ where: { id: row.id } });
  await db.idea.delete({ where: { id: idea.id } });
  await db.user.delete({ where: { id: donor.id } });
});

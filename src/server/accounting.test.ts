import assert from "node:assert/strict";
import test from "node:test";
import "./load-env";
import { splitDonation } from "./fees";
import {
  creditBlockedByEarlierNotice,
  financialDenial,
  liveEndDecision,
  planRefund,
  platformBearsProcessing,
  staffVerificationDecision,
} from "./money";
import { earningBucket } from "./ledger";
import { applyStripeFact } from "./stripe-events";
import { creditPack, lightBalance, spendLights } from "./credits";
import { db } from "./db";
import { recordDonation } from "./ledger";
import { lightsCharge } from "./credits";

test("refund plan never spends below zero and does not take a second fee", () => {
  const unused = planRefund({ packLights: 500, spendable: 500, pendingNetsOldestFirst: [] });
  assert.deepEqual(unused, {
    reverseLights: 500,
    spentLights: 0,
    exposureCents: 0,
    freezeIndexes: [],
    reviewCents: 0,
  });

  const partial = planRefund({ packLights: 500, spendable: 400, pendingNetsOldestFirst: [85, 200] });
  assert.equal(partial.reverseLights, 400);
  assert.equal(partial.spentLights, 100);
  assert.equal(partial.exposureCents, splitDonation(100).netCents);
  assert.equal(partial.exposureCents, 85);
  assert.deepEqual(partial.freezeIndexes, [0]);
  assert.equal(partial.reviewCents, 0);
  assert.equal(partial.reverseLights + partial.spentLights, 500);

  const tooBigToFreeze = planRefund({ packLights: 100, spendable: 0, pendingNetsOldestFirst: [850] });
  assert.equal(tooBigToFreeze.freezeIndexes.length, 0);
  assert.equal(tooBigToFreeze.reviewCents, splitDonation(100).netCents);
  assert.ok(tooBigToFreeze.reviewCents > 0);
});

test("card processing stays inside the platform share", () => {
  const kept = platformBearsProcessing(100, 30);
  assert.equal(kept.creatorNetCents, 85);
  assert.equal(kept.platformFeeCents, 15);
  assert.equal(kept.platformAfterProcessorCents, 15 - 30);
  const exact = platformBearsProcessing(100, 0);
  assert.equal(exact.creatorNetCents, splitDonation(100).netCents);
});

test("an earlier refund or dispute blocks a late credit", () => {
  assert.equal(creditBlockedByEarlierNotice(["REFUND_FIRST"]), true);
  assert.equal(creditBlockedByEarlierNotice(["DISPUTE"]), true);
  assert.equal(creditBlockedByEarlierNotice(["DEFERRED_SETTLE"]), false);
});

test("unauthorized financial, staff, and live actions are refused", () => {
  assert.equal(financialDenial(null), "UNAUTHENTICATED");
  assert.equal(financialDenial(undefined), "UNAUTHENTICATED");
  assert.equal(financialDenial({ id: "person" }), null);
  assert.equal(staffVerificationDecision(null, "creator-user"), "UNAUTHENTICATED");
  assert.equal(staffVerificationDecision({ id: "mod", role: "SUPPORTER" }, "other"), "FORBIDDEN");
  assert.equal(staffVerificationDecision({ id: "mod", role: "ADMIN" }, "mod"), "SELF_REVIEW");
  assert.equal(staffVerificationDecision({ id: "mod", role: "MODERATOR" }, "other"), "OK");
  assert.equal(liveEndDecision(null, "host"), "UNAUTHENTICATED");
  assert.equal(liveEndDecision({ role: "SUPPORTER", creatorId: "someone" }, "host"), "FORBIDDEN");
  assert.equal(liveEndDecision({ role: "CREATOR", creatorId: "host" }, "host"), "OK");
  assert.equal(liveEndDecision({ role: "MODERATOR", creatorId: null }, "host"), "OK");
});

test("earned, pending, frozen, and paid stay distinct", () => {
  const future = new Date(Date.now() + 86_400_000);
  const past = new Date(Date.now() - 86_400_000);
  assert.equal(earningBucket("HELD", future), "pending");
  assert.equal(earningBucket("HELD", past), "available");
  assert.equal(earningBucket("FROZEN", past), "frozen");
  assert.equal(earningBucket("PAID_OUT", past), "paid");
  assert.equal(earningBucket("PENDING", past), null);
  assert.equal(earningBucket("REFUNDED", past), null);
});

test("duplicate webhook, out-of-order refund, and concurrent spend", { skip: !process.env.DATABASE_URL }, async () => {
  const stamp = Date.now().toString(36);
  const donor = await db.user.create({
    data: { email: `books-${stamp}@test.local`, passwordHash: "x", name: "Books" },
  });
  const creatorUser = await db.user.create({
    data: { email: `maker2-${stamp}@test.local`, passwordHash: "x", name: "Maker", role: "CREATOR" },
  });
  const creator = await db.creatorProfile.create({
    data: {
      userId: creatorUser.id,
      slug: `maker2-${stamp}`,
      displayName: "Maker",
      bio: "A quiet workshop.",
      city: "Nairobi",
      avatarUrl: "/placeholder.svg",
      craftKey: "weaving",
      verificationStatus: "VERIFIED",
    },
  });
  const sessionId = `cs_test_${stamp}`;
  const paymentIntentId = `pi_test_${stamp}`;
  const event = {
    eventId: `evt_credit_${stamp}`,
    type: "checkout.session.completed" as const,
    sessionId,
    paymentIntentId,
    userId: donor.id,
    packSlug: "small",
    amountTotal: 500,
    paymentStatus: "paid",
  };

  try {
    const lateRefund = await applyStripeFact({
      eventId: `evt_refund_first_${stamp}`,
      type: "charge.refunded",
      sessionId: `cs_late_${stamp}`,
      paymentIntentId: `pi_late_${stamp}`,
      amountCents: 500,
    });
    assert.equal(lateRefund.outcome, "deferred");
    const blocked = await applyStripeFact({
      ...event,
      eventId: `evt_late_credit_${stamp}`,
      sessionId: `cs_late_${stamp}`,
      paymentIntentId: `pi_late_${stamp}`,
    });
    assert.equal(blocked.outcome, "suppressed");
    assert.equal(await lightBalance(donor.id), 0);
    const blockedAgain = await applyStripeFact({
      ...event,
      eventId: `evt_late_credit_${stamp}`,
      sessionId: `cs_late_${stamp}`,
      paymentIntentId: `pi_late_${stamp}`,
    });
    assert.equal(blockedAgain.replayed, true);
    assert.equal(await lightBalance(donor.id), 0);

    const first = await applyStripeFact(event);
    const second = await applyStripeFact(event);
    assert.equal(first.outcome, "credited");
    assert.equal(first.replayed, false);
    assert.equal(second.replayed, true);
    assert.equal(await lightBalance(donor.id), 500);

    const spent = await spendLights({
      donorId: donor.id,
      priceCents: 100,
      token: `gift-${stamp}`,
      kind: "GIFT",
      shares: [{ creatorId: creator.id, netCents: splitDonation(100).netCents }],
      giftId: null,
      anonymous: false,
      holdDays: 7,
    });
    assert.equal(spent.transaction.feeCents, 15);
    assert.equal(spent.transaction.netCents, 85);
    assert.equal(await db.moneyEvent.count({ where: { transactionId: spent.transaction.id, kind: "DONATION_RECORDED" } }), 1);

    const refund = await applyStripeFact({
      eventId: `evt_refund_${stamp}`,
      type: "charge.refunded",
      sessionId,
      paymentIntentId,
      amountCents: 500,
    });
    assert.equal(refund.outcome, "reversed-with-review");
    assert.equal(await lightBalance(donor.id), 0);
    const refundAgain = await applyStripeFact({
      eventId: `evt_refund_${stamp}`,
      type: "charge.refunded",
      sessionId,
      paymentIntentId,
      amountCents: 500,
    });
    assert.equal(refundAgain.replayed, true);
    assert.equal(await lightBalance(donor.id), 0);
    const frozen = await db.ledgerTransaction.findUnique({ where: { id: spent.transaction.id } });
    assert.equal(frozen?.status, "FROZEN");
    assert.equal(frozen?.grossCents, 100);
    assert.equal(frozen?.netCents, 85);
    const review = await db.accountReview.findUnique({ where: { stripeEventId: `evt_refund_${stamp}` } });
    assert.equal(review?.reviewCents, 0);
    assert.equal(review?.frozenCents, 85);
    assert.equal(review?.reversedCents, 400);

    const dispute = await applyStripeFact({
      eventId: `evt_dispute_${stamp}`,
      type: "charge.dispute.created",
      sessionId,
      paymentIntentId,
    });
    const disputeAgain = await applyStripeFact({
      eventId: `evt_dispute_${stamp}`,
      type: "charge.dispute.created",
      sessionId,
      paymentIntentId,
    });
    assert.equal(disputeAgain.replayed, true);
    assert.equal(await lightBalance(donor.id), 0);
    assert.ok(dispute.outcome === "reversed" || dispute.outcome === "reversed-with-review");

    await creditPack({ userId: donor.id, packSlug: "small", token: `race-${stamp}` });
    const race = await Promise.allSettled([
      spendLights({
        donorId: donor.id,
        priceCents: 500,
        token: `race-a-${stamp}`,
        kind: "GIFT",
        shares: [{ creatorId: creator.id, netCents: splitDonation(500).netCents }],
        anonymous: false,
        holdDays: 7,
      }),
      spendLights({
        donorId: donor.id,
        priceCents: 500,
        token: `race-b-${stamp}`,
        kind: "GIFT",
        shares: [{ creatorId: creator.id, netCents: splitDonation(500).netCents }],
        anonymous: false,
        holdDays: 7,
      }),
    ]);
    const won = race.filter((item) => item.status === "fulfilled");
    const lost = race.filter((item) => item.status === "rejected");
    assert.equal(won.length, 1);
    assert.equal(lost.length, 1);
    assert.equal(await lightBalance(donor.id), 0);

    const early = await applyStripeFact({
      eventId: `evt_settle_${stamp}`,
      type: "payment_intent.succeeded",
      paymentIntentId: `pi_direct_${stamp}`,
      amountCents: 100,
      feeCents: "15",
    });
    assert.equal(early.outcome, "deferred");
    const direct = await recordDonation(
      {
        donorId: donor.id,
        priceCents: 100,
        charge: { ...lightsCharge(100), mode: "stripe", stripePaymentIntentId: `pi_direct_${stamp}` },
        kind: "GIFT",
        shares: [{ creatorId: creator.id, netCents: 85 }],
        anonymous: false,
        holdDays: 7,
      },
    );
    assert.equal(direct.status, "HELD");
    assert.equal(direct.feeCents, 15);
    assert.equal(direct.netCents, 85);
    const settledAgain = await applyStripeFact({
      eventId: `evt_settle_${stamp}`,
      type: "payment_intent.succeeded",
      paymentIntentId: `pi_direct_${stamp}`,
      amountCents: 100,
      feeCents: "15",
    });
    assert.equal(settledAgain.replayed, true);
    assert.equal((await db.ledgerTransaction.findUnique({ where: { id: direct.id } }))?.grossCents, 100);
    await assert.rejects(() =>
      db.ledgerTransaction.update({ where: { id: direct.id }, data: { grossCents: 50, feeCents: 7, netCents: 43 } }),
    );
    assert.equal((await db.ledgerTransaction.findUnique({ where: { id: direct.id } }))?.grossCents, 100);
  } finally {
    await db.creditEntry.deleteMany({ where: { userId: donor.id } });
    await db.accountReview.deleteMany({ where: { userId: donor.id } });
    await db.moneyEvent.deleteMany({ where: { transaction: { donorId: donor.id } } });
    await db.ledgerAllocation.deleteMany({ where: { creatorId: creator.id } });
    await db.ledgerTransaction.deleteMany({ where: { donorId: donor.id } });
    await db.webhookDelivery.deleteMany({
      where: { id: { contains: stamp } },
    });
    await db.paymentMarker.deleteMany({
      where: { key: { contains: stamp } },
    });
    await db.creatorProfile.delete({ where: { id: creator.id } });
    await db.user.deleteMany({ where: { id: { in: [donor.id, creatorUser.id] } } });
  }
});

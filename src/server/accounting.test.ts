import assert from "node:assert/strict";
import test from "node:test";
import "./load-env";
import { splitDonation } from "./fees";
import {
  adultDecision,
  attributeRecordedNet,
  creditBlockedByEarlierNotice,
  distributeExact,
  financialDenial,
  liveEndDecision,
  payableCents,
  payoutDecision,
  planRefund,
  platformBearsProcessing,
  reducePaymentCase,
  reviewResolveDecision,
  staffVerificationDecision,
} from "./money";
import { clawbackPack } from "./holds";
import { consumeDurableLimit } from "./ratelimit";
import { creatorMoney } from "./wallet";
import { resolveAccountReview } from "./reviews";
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

  const partial = planRefund({ packLights: 500, spendable: 400, pendingNetsOldestFirst: [80, 200] });
  assert.equal(partial.reverseLights, 400);
  assert.equal(partial.spentLights, 100);
  assert.equal(partial.exposureCents, splitDonation(100).netCents);
  assert.equal(partial.exposureCents, 80);
  assert.deepEqual(partial.freezeIndexes, [0]);
  assert.equal(partial.reviewCents, 0);
  const historical = planRefund({ packLights: 500, spendable: 400, pendingNetsOldestFirst: [85, 200] });
  assert.equal(historical.exposureCents, 80);
  assert.deepEqual(historical.freezeIndexes, []);
  assert.equal(historical.reviewCents, 80);
  assert.equal(partial.reverseLights + partial.spentLights, 500);

  const tooBigToFreeze = planRefund({ packLights: 100, spendable: 0, pendingNetsOldestFirst: [850] });
  assert.equal(tooBigToFreeze.freezeIndexes.length, 0);
  assert.equal(tooBigToFreeze.reviewCents, splitDonation(100).netCents);
  assert.ok(tooBigToFreeze.reviewCents > 0);
});

test("card processing stays inside the platform share", () => {
  const kept = platformBearsProcessing(100, 30);
  assert.equal(kept.creatorNetCents, 80);
  assert.equal(kept.platformFeeCents, 20);
  assert.equal(kept.platformAfterProcessorCents, 20 - 30);
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

test("provider events do not restore twice, and a large gift is only partly reserved", () => {
  const fresh = { refunded: false, held: false, restored: false, dispute: null };
  const refunded = reducePaymentCase(fresh, "refund");
  assert.equal(refunded.effect, "clawback");
  const refundAgain = reducePaymentCase(refunded.state, "refund");
  assert.equal(refundAgain.effect, "none");
  const wonAfterRefund = reducePaymentCase(refunded.state, "dispute_won");
  assert.equal(wonAfterRefund.effect, "none");

  const disputed = reducePaymentCase(fresh, "dispute_open");
  const won = reducePaymentCase(disputed.state, "dispute_won");
  assert.equal(won.effect, "restore");
  const wonAgain = reducePaymentCase(won.state, "dispute_won");
  assert.equal(wonAgain.effect, "none");
  const refundAfterWin = reducePaymentCase(won.state, "refund");
  assert.equal(refundAfterWin.effect, "clawback");
  assert.equal(refundAfterWin.state.restored, false);

  const wonFirst = reducePaymentCase(fresh, "dispute_won");
  const disputeAfterWon = reducePaymentCase(wonFirst.state, "dispute_open");
  assert.equal(disputeAfterWon.effect, "none");
  assert.equal(wonFirst.effect, "none");

  assert.equal(attributeRecordedNet(850, 1000, 1000), 850);
  assert.equal(attributeRecordedNet(850, 100, 1000), 85);
  assert.equal(attributeRecordedNet(85, 100, 100), 85);
  assert.equal(splitDonation(100).netCents, 80);
  assert.deepEqual(distributeExact(85, [850]), [85]);
  assert.equal(payableCents({ realAvailable: 850, reserved: 85 }), 765);
  assert.equal(payableCents({ realAvailable: 50, reserved: 85 }), 0);
  assert.deepEqual(
    payoutDecision({ staffVerified: false, realAvailable: 850, sandboxAvailable: 0, reserved: 0 }),
    { payable: 0, reason: "NOT_VERIFIED" },
  );
  assert.deepEqual(
    payoutDecision({ staffVerified: true, realAvailable: 0, sandboxAvailable: 400, reserved: 0 }),
    { payable: 0, reason: "DEMO_ONLY" },
  );
  assert.equal(adultDecision({ adultAttestedAt: null }), "AGE_REQUIRED");
  assert.equal(adultDecision({ adultAttestedAt: new Date() }), "OK");
  assert.equal(
    reviewResolveDecision({ id: "staff", role: "ADMIN" }, "donor", "restore", { refunded: true, dispute: null }),
    "RESTORED_BLOCKED",
  );
  assert.equal(
    reviewResolveDecision({ id: "donor", role: "ADMIN" }, "donor", "release", { refunded: false, dispute: "won" }),
    "SELF_REVIEW",
  );
  assert.equal(
    reviewResolveDecision({ id: "person", role: "SUPPORTER" }, "donor", "retain", { refunded: false, dispute: null }),
    "FORBIDDEN",
  );
  assert.equal(
    reviewResolveDecision({ id: "staff", role: "MODERATOR" }, "donor", "release", { refunded: true, dispute: null }),
    "OK",
  );
  assert.equal(
    reviewResolveDecision({ id: "staff", role: "MODERATOR" }, "donor", "release", { refunded: false, dispute: "open" }),
    "RELEASE_BLOCKED",
  );
  assert.equal(
    reviewResolveDecision({ id: "staff", role: "ADMIN" }, "donor", "release", { refunded: false, dispute: "lost" }),
    "RELEASE_BLOCKED",
  );
  assert.equal(
    reviewResolveDecision({ id: "staff", role: "ADMIN" }, "donor", "release", { refunded: false, dispute: "won" }),
    "OK",
  );
  assert.equal(
    reviewResolveDecision({ id: "staff", role: "MODERATOR" }, "donor", "retain", { refunded: false, dispute: "lost" }),
    "OK",
  );
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
    assert.equal(spent.transaction.feeCents, 20);
    assert.equal(spent.transaction.netCents, 80);
    assert.equal(await db.moneyEvent.count({ where: { transactionId: spent.transaction.id, kind: "DONATION_RECORDED" } }), 1);

    const refund = await applyStripeFact({
      eventId: `evt_refund_${stamp}`,
      type: "charge.refunded",
      sessionId,
      paymentIntentId,
      amountCents: 500,
    });
    assert.equal(refund.outcome, "reversed-with-hold");
    assert.equal(await lightBalance(donor.id), 0);
    const refundAgain = await applyStripeFact({
      eventId: `evt_refund_${stamp}`,
      type: "charge.refunded",
      sessionId,
      paymentIntentId,
      amountCents: 500,
    });
    assert.equal(refundAgain.replayed, true);
    const refundOtherId = await applyStripeFact({
      eventId: `evt_refund_other_${stamp}`,
      type: "charge.refunded",
      sessionId,
      paymentIntentId,
      amountCents: 500,
    });
    assert.equal(refundOtherId.replayed, false);
    assert.equal(refundOtherId.outcome, "already-applied");
    assert.equal(await lightBalance(donor.id), 0);
    const giftRow = await db.ledgerTransaction.findUnique({ where: { id: spent.transaction.id } });
    assert.equal(giftRow?.status, "HELD");
    assert.equal(giftRow?.grossCents, 100);
    assert.equal(giftRow?.feeCents, 20);
    assert.equal(giftRow?.netCents, 80);
    const reserved = await db.payoutReservation.aggregate({
      where: { transactionId: spent.transaction.id, status: "ACTIVE" },
      _sum: { amountCents: true },
    });
    assert.equal(reserved._sum.amountCents, 80);
    const review = await db.accountReview.findUnique({ where: { stripeEventId: `evt_refund_${stamp}` } });
    assert.equal(review?.frozenCents, 80);
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
    assert.equal(dispute.outcome, "already-applied");
    assert.equal(disputeAgain.replayed, true);

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
      feeCents: "20",
    });
    assert.equal(early.outcome, "deferred");
    const direct = await recordDonation(
      {
        donorId: donor.id,
        priceCents: 100,
        charge: { ...lightsCharge(100), mode: "stripe", stripePaymentIntentId: `pi_direct_${stamp}` },
        kind: "GIFT",
        shares: [{ creatorId: creator.id, netCents: 80 }],
        anonymous: false,
        holdDays: 7,
      },
    );
    assert.equal(direct.status, "HELD");
    assert.equal(direct.feeCents, 20);
    assert.equal(direct.netCents, 80);
    const settledAgain = await applyStripeFact({
      eventId: `evt_settle_${stamp}`,
      type: "payment_intent.succeeded",
      paymentIntentId: `pi_direct_${stamp}`,
      amountCents: 100,
      feeCents: "20",
    });
    assert.equal(settledAgain.replayed, true);
    assert.equal((await db.ledgerTransaction.findUnique({ where: { id: direct.id } }))?.grossCents, 100);
    await assert.rejects(() =>
      db.ledgerTransaction.update({ where: { id: direct.id }, data: { grossCents: 50, feeCents: 7, netCents: 43 } }),
    );
    assert.equal((await db.ledgerTransaction.findUnique({ where: { id: direct.id } }))?.grossCents, 100);
  } finally {
    await db.creditRelease.deleteMany({ where: { packEntry: { userId: donor.id } } });
    await db.creditAllocation.deleteMany({ where: { packEntry: { userId: donor.id } } });
    await db.payoutReservation.deleteMany({ where: { transaction: { donorId: donor.id } } });
    await db.paymentCase.deleteMany({ where: { userId: donor.id } });
    await db.accountReview.deleteMany({ where: { userId: donor.id } });
    await db.moneyEvent.deleteMany({ where: { transaction: { donorId: donor.id } } });
    await db.creditEntry.deleteMany({ where: { userId: donor.id } });
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

test("partial hold on a large gift, shared packs, and staff review", { skip: !process.env.DATABASE_URL }, async () => {
  const stamp = `part${Date.now().toString(36)}`;
  const donor = await db.user.create({
    data: { email: `${stamp}@test.local`, passwordHash: "x", name: "Donor", adultAttestedAt: new Date() },
  });
  const creatorUser = await db.user.create({
    data: { email: `c-${stamp}@test.local`, passwordHash: "x", name: "Creator", role: "CREATOR", adultAttestedAt: new Date() },
  });
  const creator = await db.creatorProfile.create({
    data: {
      userId: creatorUser.id,
      slug: `c-${stamp}`,
      displayName: "Creator",
      bio: "Shop",
      city: "Nairobi",
      avatarUrl: "/placeholder.svg",
      craftKey: "weaving",
      verificationStatus: "VERIFIED",
    },
  });
  const staff = await db.user.create({
    data: { email: `s-${stamp}@test.local`, passwordHash: "x", name: "Staff", role: "ADMIN" },
  });
  try {
    await db.creditEntry.create({
      data: {
        userId: donor.id,
        amount: 500,
        kind: "PACK",
        packSlug: "small",
        idempotencyKey: `real-a-${stamp}`,
        stripeCheckoutSessionId: `cs_mock_a_${stamp}`,
      },
    });
    await db.creditEntry.create({
      data: {
        userId: donor.id,
        amount: 500,
        kind: "PACK",
        packSlug: "small",
        idempotencyKey: `real-b-${stamp}`,
        stripeCheckoutSessionId: `cs_mock_b_${stamp}`,
      },
    });
    const big = splitDonation(1000);
    const spent = await spendLights({
      donorId: donor.id,
      priceCents: 1000,
      token: `big-${stamp}`,
      kind: "GIFT",
      shares: [{ creatorId: creator.id, netCents: big.netCents }],
      anonymous: false,
      holdDays: -1,
    });
    assert.equal(spent.transaction.netCents, big.netCents);
    assert.equal(spent.transaction.sandbox, false);
    const firstPack = await db.creditEntry.findFirst({
      where: { userId: donor.id, kind: "PACK" },
      orderBy: { createdAt: "asc" },
    });
    const moved = await db.$transaction((tx) => clawbackPack(tx, firstPack!.id, 1));
    assert.equal(moved.reverseLights, 0);
    assert.equal(moved.reservedCents, attributeRecordedNet(big.netCents, 500, 1000));
    assert.equal(moved.reservedCents, 400);
    assert.notEqual(moved.reservedCents, big.netCents);
    const still = await db.ledgerTransaction.findUnique({ where: { id: spent.transaction.id } });
    assert.equal(still?.feeCents, big.feeCents);
    assert.equal(still?.netCents, big.netCents);
    const money = await creatorMoney(creator.id);
    assert.equal(money.realAvailable, big.netCents);
    assert.equal(money.payable, big.netCents - 400);
    assert.equal(money.payable, 400);

    const denied = await resolveAccountReview({ actor: { id: donor.id, role: "SUPPORTER" }, reviewId: "missing", action: "release" });
    assert.equal(denied.ok, false);
    const unauth = await resolveAccountReview({ actor: null, reviewId: "missing", action: "retain" });
    assert.equal(unauth.ok && false, false);
    assert.equal(unauth.ok ? "" : unauth.error, "NOT_FOUND");

    const first = await consumeDurableLimit(`lights-${stamp}`, donor.id, 1, 60_000);
    const second = await consumeDurableLimit(`lights-${stamp}`, donor.id, 1, 60_000);
    assert.equal(first.ok, true);
    assert.equal(second.ok, false);

    await db.report.create({
      data: { reporterId: donor.id, targetType: "USER", targetId: creatorUser.id, reason: "other", details: "test" },
    });
    await db.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId: donor.id, blockedId: creatorUser.id } },
      update: {},
      create: { blockerId: donor.id, blockedId: creatorUser.id },
    });
    const report = await db.report.findFirst({ where: { reporterId: donor.id } });
    assert.ok(report);
    assert.equal(liveEndDecision({ role: "SUPPORTER", creatorId: null }, creator.id), "FORBIDDEN");
    assert.equal(liveEndDecision({ role: "ADMIN", creatorId: null }, creator.id), "OK");
    assert.equal(staff.role, "ADMIN");
  } finally {
    await db.rateLimitHit.deleteMany({ where: { key: { contains: stamp } } });
    await db.report.deleteMany({ where: { reporterId: donor.id } });
    await db.userBlock.deleteMany({ where: { blockerId: donor.id } });
    await db.creditRelease.deleteMany({ where: { packEntry: { userId: donor.id } } });
    await db.creditAllocation.deleteMany({ where: { packEntry: { userId: donor.id } } });
    await db.payoutReservation.deleteMany({ where: { creatorId: creator.id } });
    await db.moneyEvent.deleteMany({ where: { transaction: { donorId: donor.id } } });
    await db.creditEntry.deleteMany({ where: { userId: donor.id } });
    await db.ledgerAllocation.deleteMany({ where: { creatorId: creator.id } });
    await db.ledgerTransaction.deleteMany({ where: { donorId: donor.id } });
    await db.creatorProfile.delete({ where: { id: creator.id } });
    await db.user.deleteMany({ where: { id: { in: [donor.id, creatorUser.id, staff.id] } } });
  }
});

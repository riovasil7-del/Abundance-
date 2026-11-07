import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import "./load-env";
import { db } from "./db";
import { loadFeedPage } from "./feed";
import { preferenceDecision, resetTaste, setTopic } from "./taste";

async function maker(name: string, role: "SUPPORTER" | "CREATOR" = "CREATOR") {
  const stamp = randomUUID();
  return db.user.create({
    data: {
      email: `${name}.${stamp}@example.test`,
      passwordHash: "not-used",
      name,
      role,
      adultAttestedAt: new Date(),
      ...(role === "CREATOR"
        ? {
            creatorProfile: {
              create: {
                slug: `${name}-${stamp}`,
                displayName: name,
                bio: "A maker.",
                city: "Nairobi",
                countryCode: "KE",
                avatarUrl: "/avatars/new.svg",
                craftKey: "garden",
              },
            },
          }
        : {}),
    },
    include: { creatorProfile: true },
  });
}

test("a signed-in person's taste does not leak, a block hides a video, and spend does not win", async () => {
  assert.equal(preferenceDecision(null), "UNAUTHENTICATED");
  assert.equal(preferenceDecision(undefined), "UNAUTHENTICATED");
  assert.equal(preferenceDecision({ id: "person" }), "OK");

  const viewer = await maker("Viewer", "SUPPORTER");
  const other = await maker("Other", "SUPPORTER");
  const kind = await maker("Kind");
  const paid = await maker("Paid");
  try {
    const kindVideo = await db.video.create({
      data: {
        creatorId: kind.creatorProfile!.id,
        title: "Kind",
        caption: "A shared garden.",
        storageKey: `k-${kind.id}`,
        playbackUrl: "/media/joseph.mp4",
        deedKind: "good_deed",
        language: "en",
        consentConfirmed: true,
        createdAt: new Date(Date.now() - 60_000),
      },
    });
    const paidVideo = await db.video.create({
      data: {
        creatorId: paid.creatorProfile!.id,
        title: "Paid",
        caption: "A large gift should not lift this.",
        storageKey: `p-${paid.id}`,
        playbackUrl: "/media/joseph.mp4",
        deedKind: "good_deed",
        language: "en",
        consentConfirmed: true,
        createdAt: new Date(),
      },
    });
    await db.blessing.createMany({
      data: [viewer.id, other.id, kind.id].map((userId) => ({ userId, videoId: kindVideo.id })),
    });
    await db.ledgerTransaction.create({
      data: {
        donorId: viewer.id,
        videoId: paidVideo.id,
        kind: "GIFT",
        grossCents: 10_000,
        feeCents: 1_500,
        netCents: 8_500,
        status: "HELD",
        paymentMode: "DEMO",
        sandbox: true,
      },
    });

    const ranked = await loadFeedPage({ locale: "en", userId: viewer.id, view: "forYou", cursor: null });
    const ids = ranked.items.map((item) => item.id);
    assert.ok(ids.indexOf(kindVideo.id) >= 0);
    assert.ok(ids.indexOf(paidVideo.id) >= 0);
    assert.ok(ids.indexOf(kindVideo.id) < ids.indexOf(paidVideo.id));
    assert.equal(ranked.items.find((item) => item.id === kindVideo.id)?.reasons.includes("kindness"), true);

    await setTopic(viewer.id, "garden", true);
    const own = await db.topicPreference.findMany({ where: { userId: viewer.id } });
    const theirs = await db.topicPreference.findMany({ where: { userId: other.id } });
    assert.equal(own.length, 1);
    assert.equal(theirs.length, 0);

    await db.feedHide.create({ data: { userId: viewer.id, creatorId: paid.creatorProfile!.id } });
    const hidden = await loadFeedPage({ locale: "en", userId: viewer.id, view: "forYou", cursor: null });
    assert.equal(hidden.items.some((item) => item.id === paidVideo.id), false);
    const stillThere = await loadFeedPage({ locale: "en", userId: other.id, view: "forYou", cursor: null });
    assert.equal(stillThere.items.some((item) => item.id === paidVideo.id), true);

    await db.userBlock.create({ data: { blockerId: other.id, blockedId: kind.id } });
    const blocked = await loadFeedPage({ locale: "en", userId: other.id, view: "forYou", cursor: null });
    assert.equal(blocked.items.some((item) => item.id === kindVideo.id), false);

    const page = await loadFeedPage({ locale: "en", userId: other.id, view: "forYou", cursor: null });
    if (page.nextCursor) {
      const next = await loadFeedPage({ locale: "en", userId: other.id, view: "forYou", cursor: page.nextCursor });
      const overlap = page.items.filter((item) => next.items.some((row) => row.id === item.id));
      assert.equal(overlap.length, 0);
    }

    await resetTaste(viewer.id);
    assert.equal(await db.topicPreference.count({ where: { userId: viewer.id } }), 0);
    assert.equal(await db.feedHide.count({ where: { userId: viewer.id } }), 0);
  } finally {
    const ids = [viewer.id, other.id, kind.id, paid.id];
    await db.ledgerAllocation.deleteMany({ where: { transaction: { donorId: { in: ids } } } });
    await db.ledgerTransaction.deleteMany({ where: { donorId: { in: ids } } });
    await db.blessing.deleteMany({ where: { userId: { in: ids } } });
    await db.userBlock.deleteMany({ where: { OR: [{ blockerId: { in: ids } }, { blockedId: { in: ids } }] } });
    await db.feedHide.deleteMany({ where: { userId: { in: ids } } });
    await db.topicPreference.deleteMany({ where: { userId: { in: ids } } });
    await db.feedTaste.deleteMany({ where: { userId: { in: ids } } });
    await db.video.deleteMany({ where: { creator: { userId: { in: ids } } } });
    await db.creatorProfile.deleteMany({ where: { userId: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
  }
});

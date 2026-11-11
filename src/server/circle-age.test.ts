import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import "./load-env";
import { db } from "./db";
import { mayIssuePublishGrant } from "./live-access";
import { loadLiveAudience } from "./live-sessions";
import { circlePublisherDecision } from "./money";

test("a creator who has not declared 18 cannot join a circle as a publisher", () => {
  assert.equal(circlePublisherDecision(null), "UNAUTHENTICATED");
  assert.equal(circlePublisherDecision({ adultAttestedAt: new Date(), creatorProfile: null }), "CREATOR_ONLY");
  assert.equal(circlePublisherDecision({ adultAttestedAt: null, creatorProfile: { id: "c" } }), "AGE_REQUIRED");
  assert.equal(circlePublisherDecision({ adultAttestedAt: new Date(), creatorProfile: { id: "c" } }), "OK");
});

test("a circle member without an age declaration is left out of the publish grant", async () => {
  const stamp = randomUUID();
  const adult = await db.user.create({
    data: {
      email: `adult.${stamp}@example.test`,
      passwordHash: "x",
      name: "Adult",
      role: "CREATOR",
      adultAttestedAt: new Date(),
      creatorProfile: {
        create: {
          slug: `adult-${stamp}`,
          displayName: "Adult",
          bio: "A maker.",
          city: "Nairobi",
          countryCode: "KE",
          avatarUrl: "/avatars/new.svg",
          craftKey: "garden",
        },
      },
    },
    include: { creatorProfile: true },
  });
  const minor = await db.user.create({
    data: {
      email: `minor.${stamp}@example.test`,
      passwordHash: "x",
      name: "Minor",
      role: "CREATOR",
      adultAttestedAt: null,
      creatorProfile: {
        create: {
          slug: `minor-${stamp}`,
          displayName: "Minor",
          bio: "A maker.",
          city: "Nairobi",
          countryCode: "KE",
          avatarUrl: "/avatars/new.svg",
          craftKey: "garden",
        },
      },
    },
    include: { creatorProfile: true },
  });
  try {
    const circle = await db.blessingCircle.create({
      data: {
        hostId: adult.creatorProfile!.id,
        title: "Circle",
        description: "Shared",
        participants: {
          create: [{ creatorId: adult.creatorProfile!.id }, { creatorId: minor.creatorProfile!.id }],
        },
      },
    });
    const session = await db.liveSession.create({
      data: {
        roomName: `circle_${stamp}`,
        hostId: adult.creatorProfile!.id,
        circleId: circle.id,
        title: "Circle",
      },
    });
    const loaded = await loadLiveAudience(session.id);
    assert.ok(loaded);
    assert.equal(loaded.audience.circlePublisherUserIds?.includes(adult.id), true);
    assert.equal(loaded.audience.circlePublisherUserIds?.includes(minor.id), false);
    assert.equal(mayIssuePublishGrant(adult, loaded.audience), true);
    assert.equal(mayIssuePublishGrant(minor, loaded.audience), false);
    assert.equal(mayIssuePublishGrant({ ...minor, adultAttestedAt: new Date() }, loaded.audience), false);
  } finally {
    await db.liveSession.deleteMany({ where: { hostId: adult.creatorProfile!.id } });
    await db.circleParticipant.deleteMany({ where: { creatorId: { in: [adult.creatorProfile!.id, minor.creatorProfile!.id] } } });
    await db.blessingCircle.deleteMany({ where: { hostId: adult.creatorProfile!.id } });
    await db.creatorProfile.deleteMany({ where: { userId: { in: [adult.id, minor.id] } } });
    await db.user.deleteMany({ where: { id: { in: [adult.id, minor.id] } } });
  }
});

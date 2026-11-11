import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import "./load-env";
import { followCreator, inviteCohost, respondToInvite } from "./community";
import { db } from "./db";
import { loadLiveAudience } from "./live-sessions";

async function makeCreator(name: string) {
  const stamp = randomUUID();
  return db.user.create({
    data: {
      email: `${name}.${stamp}@example.test`,
      passwordHash: "not-used",
      name,
      role: "CREATOR",
      adultAttestedAt: new Date(),
      creatorProfile: {
        create: {
          slug: `${name}-${stamp}`,
          displayName: name,
          bio: "A maker.",
          city: "Nairobi",
          avatarUrl: "/seed/avatar.svg",
          craftKey: "garden",
        },
      },
    },
    include: { creatorProfile: true },
  });
}

test("follow is unique under concurrency, and a co-host invite can be accepted and revoked", async () => {
  const follower = await db.user.create({
    data: {
      email: `follower.${randomUUID()}@example.test`,
      passwordHash: "not-used",
      name: "Follower",
      role: "SUPPORTER",
    },
  });
  const host = await makeCreator("Host");
  const guests = await Promise.all([makeCreator("One"), makeCreator("Two"), makeCreator("Three"), makeCreator("Four")]);
  const viewer = await db.user.create({
    data: {
      email: `viewer.${randomUUID()}@example.test`,
      passwordHash: "not-used",
      name: "Viewer",
      role: "SUPPORTER",
    },
  });
  try {
    const self = await followCreator(host.id, host.id);
    assert.equal("error" in self ? self.error : "", "SELF");
    const anon = await followCreator(null, host.id);
    assert.equal("error" in anon ? anon.error : "", "UNAUTHENTICATED");

    await Promise.all(Array.from({ length: 8 }, () => followCreator(follower.id, host.id)));
    const rows = await db.follow.findMany({ where: { followerId: follower.id, creatorId: host.id } });
    assert.equal(rows.length, 1);
    const again = await followCreator(follower.id, host.id);
    assert.equal("follow" in again, true);
    assert.equal(await db.follow.count({ where: { followerId: follower.id, creatorId: host.id } }), 1);

    const session = await db.liveSession.create({
      data: { roomName: `solo_${randomUUID()}`, hostId: host.creatorProfile!.id, title: "Together" },
    });
    const refused = await inviteCohost({ actorId: viewer.id, sessionId: session.id, inviteeId: guests[0]!.id });
    assert.equal("error" in refused ? refused.error : "", "NOT_HOST");

    const invited = await Promise.all(guests.map((guest) => inviteCohost({ actorId: host.id, sessionId: session.id, inviteeId: guest.id })));
    const opened = invited.flatMap((result) => ("invite" in result && result.invite ? [result.invite] : []));
    const full = invited.filter((result) => "error" in result && result.error === "FULL");
    assert.equal(opened.length, 3);
    assert.equal(full.length, 1);
    assert.equal(await db.liveInvite.count({ where: { sessionId: session.id, status: "PENDING" } }), 3);

    const first = opened[0]!;
    const noConsent = await respondToInvite({ actorId: first.inviteeId, inviteId: first.id, action: "accept", consent: false });
    assert.equal("error" in noConsent ? noConsent.error : "", "CONSENT_REQUIRED");
    let audience = await loadLiveAudience(session.id);
    assert.equal(audience?.audience.cohostUserIds?.includes(first.inviteeId), false);

    const accepted = await respondToInvite({ actorId: first.inviteeId, inviteId: first.id, action: "accept", consent: true });
    assert.equal("invite" in accepted && accepted.invite ? accepted.invite.status : "", "ACCEPTED");
    const twice = await respondToInvite({ actorId: first.inviteeId, inviteId: first.id, action: "accept", consent: true });
    assert.equal("invite" in twice && twice.invite ? twice.invite.status : "", "ACCEPTED");
    assert.equal(await db.liveInvite.count({ where: { id: first.id } }), 1);
    audience = await loadLiveAudience(session.id);
    assert.deepEqual(audience?.audience.cohostUserIds, [first.inviteeId]);

    const revoked = await respondToInvite({ actorId: host.id, inviteId: first.id, action: "revoke", consent: false });
    assert.equal("invite" in revoked && revoked.invite ? revoked.invite.status : "", "REVOKED");
    audience = await loadLiveAudience(session.id);
    assert.equal(audience?.audience.cohostUserIds?.includes(first.inviteeId), false);

    const second = opened[1]!;
    const viewerGrab = await respondToInvite({ actorId: viewer.id, inviteId: second.id, action: "accept", consent: true });
    assert.equal("error" in viewerGrab ? viewerGrab.error : "", "NOT_INVITEE");
  } finally {
    const ids = [follower.id, host.id, viewer.id, ...guests.map((guest) => guest.id)];
    await db.liveInvite.deleteMany({ where: { inviteeId: { in: ids } } });
    await db.liveSession.deleteMany({ where: { hostId: host.creatorProfile?.id } });
    await db.follow.deleteMany({ where: { OR: [{ followerId: { in: ids } }, { creatorId: { in: ids } }] } });
    await db.creatorProfile.deleteMany({ where: { userId: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import { canPublishToRoom } from "./live-access";
import {
  acceptDecision,
  followDecision,
  inviteDecision,
  liveGiftShares,
  revokeDecision,
  serverPublishGrant,
} from "./community-rules";

test("follow is refused for a stranger, yourself, a missing creator, and a block", () => {
  assert.equal(followDecision({ followerId: null, creatorUserId: "c", creatorExists: true, blocked: false }), "UNAUTHENTICATED");
  assert.equal(followDecision({ followerId: "c", creatorUserId: "c", creatorExists: true, blocked: false }), "SELF");
  assert.equal(followDecision({ followerId: "s", creatorUserId: "missing", creatorExists: false, blocked: false }), "NOT_CREATOR");
  assert.equal(followDecision({ followerId: "s", creatorUserId: "c", creatorExists: true, blocked: true }), "BLOCKED");
  assert.equal(followDecision({ followerId: "s", creatorUserId: "c", creatorExists: true, blocked: false }), "OK");
});

test("only the host can invite, and the third open invite is the last", () => {
  const base = { actorId: "host", hostUserId: "host", inviteeId: "co", inviteeIsCreator: true, openInvites: 0, blocked: false };
  assert.equal(inviteDecision(base), "OK");
  assert.equal(inviteDecision({ ...base, actorId: "viewer", inviteeId: "co" }), "NOT_HOST");
  assert.equal(inviteDecision({ ...base, actorId: null }), "UNAUTHENTICATED");
  assert.equal(inviteDecision({ ...base, inviteeId: "host" }), "SELF");
  assert.equal(inviteDecision({ ...base, inviteeIsCreator: false }), "NOT_CREATOR");
  assert.equal(inviteDecision({ ...base, blocked: true }), "BLOCKED");
  assert.equal(inviteDecision({ ...base, openInvites: 2 }), "OK");
  assert.equal(inviteDecision({ ...base, openInvites: 3 }), "FULL");
});

test("accept needs the invited person and an explicit camera consent", () => {
  assert.equal(acceptDecision({ actorId: "co", inviteeId: "co", status: "PENDING", consent: false }), "CONSENT_REQUIRED");
  assert.equal(acceptDecision({ actorId: "co", inviteeId: "co", status: "PENDING", consent: true }), "OK");
  assert.equal(acceptDecision({ actorId: "host", inviteeId: "co", status: "PENDING", consent: true }), "NOT_INVITEE");
  assert.equal(acceptDecision({ actorId: "co", inviteeId: "co", status: "REVOKED", consent: true }), "NOT_PENDING");
  assert.equal(acceptDecision({ actorId: "co", inviteeId: "co", status: "ACCEPTED", consent: false }), "OK");
  assert.equal(revokeDecision({ actorId: "viewer", hostUserId: "host", status: "ACCEPTED" }), "NOT_HOST");
  assert.equal(revokeDecision({ actorId: "host", hostUserId: "host", status: "ACCEPTED" }), "OK");
});

test("mocked LiveKit grant, no live server: a viewer cannot publish by asking", () => {
  const audience = { hostUserId: "host", circlePublisherUserIds: null, cohostUserIds: ["cohost"] };
  const viewer = serverPublishGrant("viewer", audience, true, canPublishToRoom);
  assert.equal(viewer.canPublish, false);
  assert.equal(viewer.ignoredClientRequest, true);
  const pending = serverPublishGrant("pending", audience, true, canPublishToRoom);
  assert.equal(pending.canPublish, false);
  const cohost = serverPublishGrant("cohost", audience, false, canPublishToRoom);
  assert.equal(cohost.canPublish, true);
  const host = serverPublishGrant("host", audience, false, canPublishToRoom);
  assert.equal(host.canPublish, true);
  assert.equal(canPublishToRoom("guest_abc", audience), false);
});

test("a selected creator receives the whole 80 percent and co-hosts are not split in silently", () => {
  const selected = liveGiftShares({
    priceCents: 100,
    selectedCreatorId: "cohost-profile",
    hostCreatorId: "host-profile",
    circleCreatorIds: null,
    acceptedCohostCreatorIds: ["cohost-profile", "other-profile"],
  });
  assert.ok(!("error" in selected));
  if ("error" in selected) return;
  assert.equal(selected.feeCents, 20);
  assert.equal(selected.netCents, 80);
  assert.equal(selected.feeCents + selected.netCents, 100);
  assert.deepEqual(selected.shares, [{ creatorId: "cohost-profile", netCents: 80 }]);

  const stranger = liveGiftShares({
    priceCents: 100,
    selectedCreatorId: "stranger",
    hostCreatorId: "host-profile",
    circleCreatorIds: null,
    acceptedCohostCreatorIds: ["cohost-profile"],
  });
  assert.deepEqual(stranger, { error: "NOT_IN_ROOM" });

  const circle = liveGiftShares({
    priceCents: 100,
    selectedCreatorId: null,
    hostCreatorId: "host-profile",
    circleCreatorIds: ["a", "b"],
    acceptedCohostCreatorIds: ["cohost-profile"],
  });
  assert.ok(!("error" in circle));
  if ("error" in circle) return;
  assert.equal(circle.shares.reduce((sum, share) => sum + share.netCents, 0), 80);
  assert.equal(circle.shares.some((share) => share.creatorId === "cohost-profile"), false);
  assert.equal(circle.feeCents, 20);

  const oneCircleMember = liveGiftShares({
    priceCents: 500,
    selectedCreatorId: "a",
    hostCreatorId: "host-profile",
    circleCreatorIds: ["a", "b"],
    acceptedCohostCreatorIds: [],
  });
  assert.ok(!("error" in oneCircleMember));
  if ("error" in oneCircleMember) return;
  assert.equal(oneCircleMember.feeCents, 100);
  assert.deepEqual(oneCircleMember.shares, [{ creatorId: "a", netCents: 400 }]);
});

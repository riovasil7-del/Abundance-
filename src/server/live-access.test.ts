import assert from "node:assert/strict";
import test from "node:test";
import { canPublishToRoom, readLiveKitCredentials, readVideoGrant, tokenForParticipant, videoGrant } from "./live-access";

const credentials = {
  url: "ws://127.0.0.1:7880",
  apiKey: "devkey",
  apiSecret: "secret-that-is-long-enough-for-hmac",
};

test("blank LiveKit keys stay unconfigured instead of throwing", () => {
  assert.equal(readLiveKitCredentials({}), null);
  assert.equal(readLiveKitCredentials({ LIVEKIT_URL: "wss://example.livekit.cloud", LIVEKIT_API_KEY: " ", LIVEKIT_API_SECRET: "secret" }), null);
  assert.ok(readLiveKitCredentials({ LIVEKIT_URL: "wss://example.livekit.cloud", LIVEKIT_API_KEY: "key", LIVEKIT_API_SECRET: "secret" }));
});

test("only the room creator can publish in a solo room", () => {
  const audience = { hostUserId: "creator-user", circlePublisherUserIds: null };
  assert.equal(canPublishToRoom("creator-user", audience), true);
  assert.equal(canPublishToRoom("another-creator", audience), false);
  assert.equal(canPublishToRoom("supporter", audience), false);
  assert.equal(canPublishToRoom("guest_abc", audience), false);
});

test("a blessing circle lets every participant creator publish and nobody else", () => {
  const audience = {
    hostUserId: "joseph",
    circlePublisherUserIds: ["joseph", "amina", "grace"],
  };
  assert.equal(canPublishToRoom("joseph", audience), true);
  assert.equal(canPublishToRoom("amina", audience), true);
  assert.equal(canPublishToRoom("grace", audience), true);
  assert.equal(canPublishToRoom("elena", audience), false);
  assert.equal(canPublishToRoom("stranger", audience), false);
});

test("viewer tokens subscribe only; the creator token can publish", async () => {
  const room = "solo_creator_1";
  const audience = { hostUserId: "creator-user", circlePublisherUserIds: null };

  const host = await tokenForParticipant({
    credentials,
    userId: "creator-user",
    name: "Amina",
    room,
    audience,
  });
  const viewer = await tokenForParticipant({
    credentials,
    userId: "supporter",
    name: "Elena",
    room,
    audience,
  });

  assert.equal(host.canPublish, true);
  assert.equal(viewer.canPublish, false);

  const hostGrant = await readVideoGrant(host.token, credentials.apiKey, credentials.apiSecret);
  const viewerGrant = await readVideoGrant(viewer.token, credentials.apiKey, credentials.apiSecret);

  assert.equal(hostGrant?.room, room);
  assert.equal(hostGrant?.roomJoin, true);
  assert.equal(hostGrant?.canPublish, true);
  assert.equal(hostGrant?.canSubscribe, true);
  assert.equal(hostGrant?.canPublishData, true);

  assert.deepEqual(viewerGrant, videoGrant(room, false));
  assert.equal(viewerGrant?.canPublish, false);
  assert.equal(viewerGrant?.canSubscribe, true);
  assert.equal(viewerGrant?.canPublishData, true);
});

test("mocked LiveKit token, no live server: an accepted co-host can publish and a viewer cannot", async () => {
  const audience = { hostUserId: "host", circlePublisherUserIds: null, cohostUserIds: ["cohost"] };
  const cohost = await tokenForParticipant({
    credentials,
    userId: "cohost",
    name: "Joseph",
    room: "solo_host",
    audience,
  });
  const viewer = await tokenForParticipant({
    credentials,
    userId: "viewer",
    name: "Elena",
    room: "solo_host",
    audience,
  });
  assert.equal(cohost.canPublish, true);
  assert.equal(viewer.canPublish, false);
  const cohostGrant = await readVideoGrant(cohost.token, credentials.apiKey, credentials.apiSecret);
  const viewerGrant = await readVideoGrant(viewer.token, credentials.apiKey, credentials.apiSecret);
  assert.equal(cohostGrant?.canPublish, true);
  assert.equal(viewerGrant?.canPublish, false);
});

test("an anonymous guest can watch and cannot publish picture or room data", async () => {
  const audience = { hostUserId: "creator-user", circlePublisherUserIds: null };
  const guest = await tokenForParticipant({
    credentials,
    userId: "guest_watch",
    name: "Hosť",
    room: "room-guest",
    audience,
  });
  assert.equal(guest.canPublish, false);
  const grant = await readVideoGrant(guest.token, credentials.apiKey, credentials.apiSecret);
  assert.equal(grant?.roomJoin, true);
  assert.equal(grant?.canSubscribe, true);
  assert.equal(grant?.canPublish, false);
  assert.equal(grant?.canPublishData, false);
});

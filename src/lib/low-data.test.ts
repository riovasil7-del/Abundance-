import assert from "node:assert/strict";
import test from "node:test";
import {
  draftsFor,
  dropDraft,
  feedSourceAllowed,
  mediaPublishDecision,
  qualityOptions,
  releaseTracks,
  remoteVideoSubscribed,
  videoPreload,
} from "./low-data";
import { rememberGiftToken } from "./gift-guard";

test("low data does not preload the next video, and one file has no quality menu", () => {
  assert.equal(videoPreload(3, 2, false), "metadata");
  assert.equal(videoPreload(3, 2, true), "none");
  assert.equal(videoPreload(2, 2, true), "metadata");
  assert.equal(feedSourceAllowed(1, 2, false), true);
  assert.equal(feedSourceAllowed(1, 2, true), false);
  assert.equal(feedSourceAllowed(2, 2, true), true);
  assert.deepEqual(qualityOptions(["only"]), { selectable: false, options: ["only"] });
  assert.deepEqual(qualityOptions(["low", "high"]), { selectable: true, options: ["low", "high"] });
  assert.equal(remoteVideoSubscribed(true), false);
  assert.equal(remoteVideoSubscribed(false), true);
});

test("a reconnect keeps one gift token", () => {
  let n = 0;
  const mint = () => `tok-${++n}`;
  const first = rememberGiftToken(null, mint);
  assert.equal(rememberGiftToken(first, mint), first);
  assert.equal(n, 1);
});

test("drafts stay with their owner, and microphone tracks are stopped", () => {
  const rows = [
    { id: "a", ownerId: "amina", title: "Soup", caption: "Pot", deedKind: "good_deed", updatedAt: 2 },
    { id: "b", ownerId: "elena", title: "Note", caption: "Mine", deedKind: "good_deed", updatedAt: 3 },
  ];
  assert.deepEqual(draftsFor(rows, "amina").map((row) => row.id), ["a"]);
  assert.deepEqual(dropDraft(rows, "elena", "a"), rows);
  assert.equal(dropDraft(rows, "amina", "a").some((row) => row.id === "a"), false);
  const stopped: string[] = [];
  releaseTracks([{ stop: () => stopped.push("mic") }, { stop: () => stopped.push("cam") }]);
  assert.deepEqual(stopped, ["mic", "cam"]);
});

test("vercel disk and a missing blob token block pictures; local dev is labelled", () => {
  assert.equal(mediaPublishDecision({ VIDEO_STORAGE: "local" }), "local-test");
  assert.equal(mediaPublishDecision({ VIDEO_STORAGE: "local", VERCEL: "1" }), "blocked");
  assert.equal(mediaPublishDecision({ VIDEO_STORAGE: "vercel-blob" }), "blocked");
  assert.equal(mediaPublishDecision({ VIDEO_STORAGE: "vercel-blob", BLOB_READ_WRITE_TOKEN: "tok" }), "durable");
  assert.equal(mediaPublishDecision({}), "local-test");
});

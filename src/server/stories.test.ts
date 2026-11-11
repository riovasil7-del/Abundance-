import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import jpeg from "jpeg-js";
import "./load-env";
import { db } from "./db";
import { loadFeedPage } from "./feed";
import { resolveUploadPath } from "./storage";
import { createPhotoStory, createTextStory, deleteStory, readStory, storyAccess, updateStory } from "./stories";

async function creator(name: string) {
  const stamp = randomUUID();
  return db.user.create({
    data: {
      email: `${name}.${stamp}@example.test`,
      passwordHash: "x",
      name,
      role: "CREATOR",
      adultAttestedAt: new Date(),
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
    },
    include: { creatorProfile: true },
  });
}

test("a draft stays off every feed, another person cannot open it, and words need no video", async () => {
  assert.equal(storyAccess("owner", "owner", "DRAFT", "VISIBLE"), "OWNER");
  assert.equal(storyAccess("other", "owner", "DRAFT", "VISIBLE"), "HIDDEN");
  assert.equal(storyAccess("other", "owner", "PRIVATE", "VISIBLE"), "HIDDEN");
  assert.equal(storyAccess("other", "owner", "PUBLISHED", "FLAGGED"), "HIDDEN");
  assert.equal(storyAccess("other", "owner", "PUBLISHED", "VISIBLE"), "PUBLIC");

  const owner = await creator("Owner");
  const other = await creator("Reader");
  try {
    const draft = await createTextStory({
      actorId: owner.id,
      creatorId: owner.creatorProfile!.id,
      title: "Soup for the next door",
      caption: "A pot of soup. No camera.",
      deedKind: "good_deed",
      visibility: "DRAFT",
    });
    assert.equal(draft.story.playbackUrl, null);
    assert.equal(draft.story.mediaKind, "NONE");
    for (const view of ["forYou", "following", "community"] as const) {
      const page = await loadFeedPage({ locale: "en", userId: other.id, view, cursor: null });
      assert.equal(page.items.some((item) => item.id === draft.story.id), false);
    }
    const hidden = await readStory(other.id, draft.story.id);
    assert.equal("error" in hidden ? hidden.error : "", "NOT_FOUND");
    const stolen = await updateStory(other.id, draft.story.id, { visibility: "PUBLISHED" });
    assert.equal("error" in stolen ? stolen.error : "", "FORBIDDEN");
    const removed = await deleteStory(other.id, draft.story.id);
    assert.equal("error" in removed ? removed.error : "", "FORBIDDEN");

    const published = await updateStory(owner.id, draft.story.id, { visibility: "PUBLISHED" });
    assert.equal("story" in published && published.story ? published.story.visibility : "", "PUBLISHED");
    const community = await loadFeedPage({ locale: "en", userId: other.id, view: "community", cursor: null });
    assert.equal(community.items.some((item) => item.id === draft.story.id), true);
    const seen = await readStory(other.id, draft.story.id);
    assert.equal("story" in seen, true);

    await deleteStory(owner.id, draft.story.id);
    const after = await loadFeedPage({ locale: "en", userId: other.id, view: "community", cursor: null });
    assert.equal(after.items.some((item) => item.id === draft.story.id), false);
    assert.equal("error" in (await readStory(owner.id, draft.story.id)) ? "gone" : "", "gone");
  } finally {
    const ids = [owner.id, other.id];
    await db.video.deleteMany({ where: { creator: { userId: { in: ids } } } });
    await db.creatorProfile.deleteMany({ where: { userId: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
  }
});

test("a timed-out story publish with the same token does not create a second row", async () => {
  const owner = await creator("Retry");
  try {
    const first = await createTextStory({
      actorId: owner.id,
      creatorId: owner.creatorProfile!.id,
      title: "One attempt",
      caption: "The timeout retries this same token.",
      deedKind: "good_deed",
      visibility: "DRAFT",
      clientToken: "same-token-1234",
    });
    const second = await createTextStory({
      actorId: owner.id,
      creatorId: owner.creatorProfile!.id,
      title: "One attempt changed",
      caption: "This must not become a second story.",
      deedKind: "good_deed",
      visibility: "PUBLISHED",
      clientToken: "same-token-1234",
    });
    assert.equal(second.replayed, true);
    assert.equal(second.story?.id, first.story.id);
    assert.equal(await db.video.count({ where: { creatorId: owner.creatorProfile!.id, title: { startsWith: "One attempt" } } }), 1);
  } finally {
    await db.storyReceipt.deleteMany({ where: { userId: owner.id } });
    await db.video.deleteMany({ where: { creatorId: owner.creatorProfile!.id } });
    await db.creatorProfile.deleteMany({ where: { userId: owner.id } });
    await db.user.deleteMany({ where: { id: owner.id } });
  }
});

test("a published photo stores the painted PNG and not the camera note", async () => {
  const owner = await creator("Painter");
  const raw = Buffer.alloc(24 * 24 * 4, 255);
  const encoded = jpeg.encode({ data: raw, width: 24, height: 24 }, 80);
  const secret = Buffer.from("GPSLATSECRET-photo");
  const segment = Buffer.alloc(4 + secret.length);
  segment[0] = 0xff;
  segment[1] = 0xfe;
  segment.writeUInt16BE(secret.length + 2, 2);
  secret.copy(segment, 4);
  const original = Buffer.concat([encoded.data.subarray(0, 2), segment, encoded.data.subarray(2)]);
  try {
    const skipped = await createPhotoStory({
      actorId: owner.id,
      creatorId: owner.creatorProfile!.id,
      title: "Covered pot",
      caption: "Only the pot remains.",
      deedKind: "good_deed",
      visibility: "PUBLISHED",
      peopleNote: "COVERED",
      reviewed: false,
      bytes: original,
      regions: [{ x: 0, y: 0, w: 1, h: 1 }],
    });
    assert.equal("error" in skipped ? skipped.error : "", "REVIEW_REQUIRED");
    const saved = await createPhotoStory({
      actorId: owner.id,
      creatorId: owner.creatorProfile!.id,
      title: "Covered pot",
      caption: "Only the pot remains.",
      deedKind: "good_deed",
      visibility: "PUBLISHED",
      peopleNote: "COVERED",
      reviewed: true,
      bytes: original,
      regions: [{ x: 0, y: 0, w: 1, h: 1 }],
    });
    if (!("story" in saved) || !saved.story?.storageKey) {
      assert.fail("photo was not stored");
      return;
    }
    const full = resolveUploadPath(saved.story.storageKey);
    assert.ok(full);
    const disk = await readFile(full!);
    assert.equal(disk.includes(secret), false);
    assert.equal(disk[0], 0x89);
    assert.equal(saved.story.playbackUrl?.endsWith(".png"), true);
    await deleteStory(owner.id, saved.story.id);
  } finally {
    await db.video.deleteMany({ where: { creatorId: owner.creatorProfile!.id } });
    await db.creatorProfile.deleteMany({ where: { userId: owner.id } });
    await db.user.deleteMany({ where: { id: owner.id } });
  }
});
